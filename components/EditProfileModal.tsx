import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Avatar,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Spacer,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import {
  prepareWriteContract,
  waitForTransaction,
  writeContract,
} from '@wagmi/core';
import axios, { AxiosError } from 'axios';
import { utils } from 'ethers';
import { isEmpty } from 'lodash';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import { FiArrowLeft } from 'react-icons/fi';
import { MdCameraAlt } from 'react-icons/md';
import { useAccount, useNetwork } from 'wagmi';
import { setLocale } from 'yup';
import { chainAddresses } from '../abi/address';
import ProfileABI from '../abi/ProfileImage.json';
import getCroppedImg from './cropImage.js';
function EditProfile({ isOpen, onClose, user, setUpdate }: any) {
  const router = useRouter();
  const { address } = useAccount();
  //mint nft here or give option to upload profile pic as normal
  const [name, setName] = useState(user.name);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    user.profileImage
  );
  const { chain } = useNetwork();
  const characterLimit = 50;
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedArea, setCroppedArea] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInfo, setIsInfo] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [value, setValue] = React.useState('1');
  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedArea(croppedAreaPixels);
    },
    []
  );
  useEffect(() => {
    setImageUrl(user.profileImage);
    setName(user.name);
  }, [user]);

  const handleCrop = async () => {
    setIsCropMode(false);
    const { file, url } = await getCroppedImg(imageUrl, croppedArea);
    setImageUrl(url);
    setFile(file);
  };

  const onDrop = useCallback((acceptedFiles: any) => {
    if (acceptedFiles) {
      const file = acceptedFiles[0];
      if (file) {
        setFile(file);
        setImageUrl(URL.createObjectURL(file));
        setIsCropMode(true);
      }
    }
  }, []);

  //handle submit for basic upload and open confirmation modal for NFT upload
  const handleSubmit = async () => {
    const formData = new FormData();
    if (file) {
      formData.append('image', file);
    }
    if (name) {
      formData.append('name', name);
    }
    try {
      //check if regular upload
      if (value === '1') {
        setIsLoading(true);
        if (!file) {
          setIsInfo('saving changes...');
        } else {
          setIsInfo('uploading metadata to ipfs...');
        }
        await axios.post('/api/profile/update', formData);
        // reset();
        onClose();
        setUpdate((prev: boolean) => !prev);
      }
      //if NFT upload then open modal and let nftHandler take over from there
      else if (value === '2') {
        onOpenNFT();
      }
    } catch (error: any) {
      setIsInfo(error.response.data.message);
    } finally {
      setIsLoading(false);
      setIsInfo(null);
    }
  };

  const nftHandler = async () => {
    //first upload the image to ipfs & save hash in db
    //save it as metadata with json and upload the metadata to ipfs and return the link
    onCloseNFT();
    const formData = new FormData();
    if (file) {
      formData.append('image', file);
    } else if (!file && imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const tempFile = new File([blob], 'temp', { type: blob.type });
        formData.append('image', tempFile);
      } catch (error) {
        setIsInfo('Error creating temporary file...');
      }
    }
    if (name) {
      formData.append('name', name);
    }
    try {
      setIsLoading(true);
      setIsInfo('uploading metadata to ipfs...');
      const res = await axios.post('/api/profile/metadata', formData);
      const config = await prepareWriteContract({
        address: chainAddresses[chain?.id].ProfileImage,
        abi: ProfileABI.output.abi,
        functionName: 'mint',
        args: [address, res.data.postMetaData],
      });
      const { hash } = await writeContract(config);
      setIsInfo('awaiting completion of mint...');
      const data = await waitForTransaction({
        hash,
      });
      const nftId = parseInt(utils.hexStripZeros(data.logs[1].data));
      if (!(nftId >= 0 && Number.isInteger(nftId))) {
        throw new Error('Something went wrong. Please try again.');
      }
      await axios.post('/api/profile/save_nft_id', { nftId });
      setIsInfo('Successfully updated');
      // reset();
      onClose();
      setUpdate((prev: boolean) => !prev);
    } catch (error: any) {
      if (error?.response?.data?.message) {
        setIsInfo(error.response.data.message);
      } else {
        setIsInfo(error?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  const {
    getRootProps,
    getInputProps,
    isDragAccept,
    isDragReject,
    isDragActive,
  } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
    },
  });
  //post as nft modal handlers
  const {
    isOpen: isOpenNFT,
    onOpen: onOpenNFT,
    onClose: onCloseNFT,
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  //
  return (
    <Modal
      blockScrollOnMount={true}
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
    >
      <ModalOverlay />
      <AlertDialog
        isCentered
        isOpen={isOpenNFT}
        leastDestructiveRef={cancelRef}
        onClose={onCloseNFT}
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4} bg="gray.900">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirmation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to mint Profile Picture as NFT ?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onCloseNFT}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={nftHandler} ml={3}>
                Yes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ModalContent
        bgColor="gray.900"
        borderWidth="1px"
        maxH="80vh"
        overflowY="auto"
        mx={4}
      >
        <ModalHeader>Edit Profile</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isCropMode ? (
            <>
              <Button
                onClick={() => {
                  setIsCropMode(false);
                }}
                w="fit-content"
              >
                <FiArrowLeft />
              </Button>

              <Box
                w="full"
                mt={2}
                bg="gray.900"
                // borderRadius="md"
                justifyContent="center"
                borderWidth={1}
                alignItems="center"
                cursor="pointer"
                pos="relative"
                h="50vh"
              >
                <Box
                  pos="absolute"
                  top="0"
                  left="0"
                  right="0"
                  bottom="0"
                  w="full"
                >
                  <Cropper
                    image={imageUrl}
                    crop={crop}
                    zoom={zoom}
                    cropShape="round"
                    aspect={1 / 1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </Box>
              </Box>
              <Slider
                aria-label="zoom"
                colorScheme="blue"
                value={zoom}
                min={1}
                max={3}
                mt={4}
                step={0.1}
                onChange={(val) => {
                  setZoom(val);
                }}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </>
          ) : (
            <Box>
              <FormControl id="name" mb={4}>
                <FormLabel>Name</FormLabel>
                <InputGroup>
                  <InputRightElement
                    pointerEvents="none"
                    fontSize="sm"
                    color="gray.500"
                  >
                    {name.length}/{characterLimit}
                  </InputRightElement>
                  <Input
                    type="text"
                    placeholder="Add a comment..."
                    focusBorderColor="blue.200"
                    value={name}
                    // maxLength={characterLimit}
                    onChange={(e) => {
                      if (isEmpty(e.target.value)) {
                        setName('');
                        setNameError('Name cannot be blank');
                        return;
                      }
                      if (e.target.value.length > characterLimit) {
                        setNameError(
                          `Name cannot be longer than ${characterLimit} characters`
                        );
                        return;
                      }
                      setNameError(null);
                      setName(e.target.value);
                    }}
                  />
                  <InputRightElement pointerEvents="none" />
                </InputGroup>
                {nameError && (
                  <Text mt={2} color="red.500">
                    {nameError}
                  </Text>
                )}
              </FormControl>

              <FormControl id="image">
                <>
                  <FormLabel></FormLabel>
                  <Box
                    {...getRootProps()}
                    w="full"
                    mt={4}
                    bg="gray.900"
                    // borderRadius="md"
                    justifyContent="center"
                    borderWidth={1}
                    borderStyle={isDragActive ? 'dashed' : 'solid'}
                    borderColor={
                      isDragAccept
                        ? 'blue.200'
                        : isDragReject
                        ? 'red.500'
                        : 'gray.700'
                    }
                    alignItems="center"
                    cursor="pointer"
                    // p={4}
                  >
                    <Center position="relative">
                      <Image src={imageUrl} />
                      <Box
                        position="absolute"
                        top="50%"
                        left="50%"
                        transform="translate(-50%, -50%)"
                        padding="4px"
                        cursor="pointer"
                        backgroundColor="rgba(0, 0, 0, 0.5)"
                        borderRadius="50%"
                        transition="background-color 0.2s"
                        _hover={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
                      >
                        <MdCameraAlt style={{ fontSize: '48px' }} />
                      </Box>
                    </Center>

                    <input
                      type="file"
                      {...getInputProps()}
                      accept="image/*"
                      placeholder="Choose an image"
                    />
                    {isDragAccept && (
                      <Text color="white" textAlign="center">
                        Drop your image here
                      </Text>
                    )}
                    {isDragReject && (
                      <Text color="red" textAlign="center">
                        File type not supported
                      </Text>
                    )}
                  </Box>

                  {isInfo && <Text mt={2}>{isInfo}</Text>}
                </>
              </FormControl>
            </Box>
          )}
        </ModalBody>
        <ModalFooter>
          {isCropMode ? (
            <>
              <Button
                colorScheme="blue"
                onClick={handleCrop}
                // isLoading={isFetching}
              >
                Apply Crop
                {/* {isFetching ? <Spinner size="sm" /> : 'Buy'} */}
              </Button>
            </>
          ) : (
            <>
              <Flex justifyContent="space-between" width="full">
                <RadioGroup
                  colorScheme="blue"
                  onChange={setValue}
                  value={value}
                >
                  <Stack direction={{ base: 'column', md: 'row' }}>
                    <Radio value="1" mr={1}>
                      Regular Upload
                    </Radio>
                    <Radio value="2">NFT Mint</Radio>
                  </Stack>
                </RadioGroup>
                <Button
                  colorScheme="blue"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                >
                  Save
                </Button>
              </Flex>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default EditProfile;
