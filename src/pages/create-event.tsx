import {
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Spacer,
  Text,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import {
  prepareWriteContract,
  waitForTransaction,
  writeContract,
} from '@wagmi/core';
import axios from 'axios';
import { ethers } from 'ethers';
import {
  Field,
  Form,
  Formik,
  FormikHelpers,
  FormikValues,
  getIn,
} from 'formik';
import { isEmpty } from 'lodash';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Accept, useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import { FaImages } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import { IoImagesOutline } from 'react-icons/io5';
import { MdCameraAlt, MdClose } from 'react-icons/md';
import { start } from 'repl';
import { useNetwork } from 'wagmi';
import { chainAddresses } from '../../abi/address';
import TicketABI from '../../abi/TicketFactory.json';
import getCroppedImg from '../../components/cropImage';
import { useNotification } from '../../context/NotificationContext';
function CreateEvent() {
  const roundOffToNearest15Minutes = (date: Date): Date => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      roundedMinutes
    );
  };
  const { chain } = useNetwork();
  const formRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification, removeNotification } = useNotification();
  const [file, setFile] = useState<File | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [editfile, setEditFile] = useState<File | undefined>(undefined);
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>(
    undefined
  );
  const [startDate, setStartDate] = useState<Date>(
    roundOffToNearest15Minutes(new Date())
  );
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedArea, setCroppedArea] = useState<any>(null);
  const [zoom, setZoom] = useState(1);

  const [endDate, setEndDate] = useState<Date>(
    roundOffToNearest15Minutes(new Date(Date.now() + 60 * 60 * 1000))
  );

  const onDrop = useCallback((acceptedFiles: any) => {
    console.log(acceptedFiles);
    if (acceptedFiles) {
      const file = acceptedFiles[0];
      if (file) {
        setEditFile(file);
        setEditImageUrl(URL.createObjectURL(file));
        setIsCropMode(true);
        onOpen();
      }
    }
  }, []);

  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedArea(croppedAreaPixels);
    },
    []
  );

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

  const handleRemoveImage = () => {
    setImageUrl(undefined);
    setFile(undefined);
  };

  const handleSubmit = async (values: FormikValues) => {
    setIsLoading(true);
    addNotification({
      status: 'info',
      title: 'Uploading metadata to ipfs...',
    });
    const formData = new FormData();
    if (file) {
      formData.append('image', file);
    }
    if (values.name) {
      formData.append('name', values.name);
    }
    if (values.description) {
      formData.append('description', values.description);
    }
    try {
      const res = await axios.post('/api/event/metadata', formData);
      const eventLink = res.data.eventMetaData;
      addNotification({
        status: 'success',
        title: 'IPFS upload successful. Initiating mint process...',
        description: 'Initiating mint process...',
      });
      //web3 stuff from here onwards to create event in blockwave contract
      const config = await prepareWriteContract({
        address: chainAddresses[chain?.id].TicketFactory,
        abi: TicketABI.output.abi,
        functionName: 'createTicket',
        args: [
          values.supply,
          ethers.utils.parseUnits(values.price?.toString()),
          ethers.BigNumber.from(
            Math.floor(startDate.getTime() / 1000).toString()
          ),
          ethers.BigNumber.from(
            Math.floor(endDate.getTime() / 1000).toString()
          ),
          eventLink,
          {
            gasLimit: 1300000,
          },
        ],
      });
      const { hash } = await writeContract(config);
      addNotification({
        status: 'info',
        title: 'Waiting for confirmation',
        description: `Transaction hash: ${hash?.slice(0, 6)}....${hash?.slice(
          -6
        )}`,
      });
      const data = await waitForTransaction({
        hash,
      });
      setImageUrl(undefined);
      setFile(undefined);
      setIsLoading(false);
      formRef.current?.resetForm();
      addNotification({
        status: 'success',
        title: 'Event Creation Successful',
        description: `Your event has been successfully created. Transaction hash: ${hash?.slice(
          0,
          6
        )}....${hash?.slice(
          -6
        )}. You can check your event in the My Events tab.`,
      });
    } catch (error: any) {
      if (error?.reponse?.data?.message) {
        addNotification({
          status: 'error',
          title: 'Error',
          description: error.response.data.message,
          autoClose: true,
        });
      } else {
        addNotification({
          status: 'error',
          title: 'Error',
          description: error.message,
          autoClose: true,
        });
      }
      setIsLoading(false);
    }
  };

  const router = useRouter();
  const validate = (values: FormikValues) => {
    const errors: FormikValues = {};
    if (!values.name) {
      errors.name = '*Name is required';
    }
    if (!values.description) {
      errors.description = '*Description is required';
    }
    if (!values.supply) {
      errors.supply = '*Total supply is required';
    } else if (values.supply < 0) {
      errors.supply = '*Total supply should be greater than 0';
    } else if (!Number.isInteger(Number(values.supply))) {
      errors.supply = '*Total supply should be a whole number';
    }

    if (!values.price) {
      errors.price = '*Ticket price is required';
    } else if (values.price < 0) {
      errors.price = '*Ticket price should be greater than 0';
    }
    if (!startDate) {
      errors.start = '*Start date is required';
    }
    if (!endDate) {
      errors.end = '*End date is required';
    }
    if (!file) {
      errors.image = '*Cover image is required';
    }
    return errors;
  };

  const handleCrop = async () => {
    setIsCropMode(false);
    const { file, url } = await getCroppedImg(editImageUrl, croppedArea);
    setImageUrl(url);
    setFile(file);
  };

  //handle event image crop
  //post as nft modal handlers
  const { isOpen, onOpen, onClose } = useDisclosure();
  //

  return (
    <>
      {isCropMode && (
        <Modal
          blockScrollOnMount={true}
          isOpen={isOpen}
          onClose={() => {
            onClose();
          }}
        >
          <ModalContent bgColor="gray.900" maxH="80vh" overflowY="auto" mx={4}>
            <ModalHeader>Edit Image</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <>
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
                      image={editImageUrl}
                      crop={crop}
                      zoom={zoom}
                      cropShape="rect"
                      aspect={16 / 9}
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
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleCrop}>
                Apply Crop
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      <Flex direction="column" mb={16}>
        <Button
          mb={4}
          colorScheme="blue"
          // bg="gray.700"
          onClick={() => router.back()}
          w="fit-content"
        >
          <FiArrowLeft />
          <Text ml={2}>Back</Text>
        </Button>
        <Box
          width="full"
          maxWidth="2xl"
          px={8}
          py={4}
          bg="gray.900"
          borderRadius="md"
          borderWidth="1px"
        >
          <Text fontSize="xl" my={4} fontWeight="bold">
            Create Your Own Event
          </Text>
          <Box display="flex" alignItems="center" mb={4}>
            <Text color="blue.200" mt={2} mb={4}>
              Please fill in the following fields to create your event as an
              ERC-1155 NFT Token. Mint your NFT using the form below with an
              easy one step process.
            </Text>
          </Box>
          <Formik
            innerRef={formRef}
            initialValues={{
              name: '',
              description: '',
              supply: '',
              price: '',
              image: '',
              start: '',
              end: '',
            }}
            onSubmit={handleSubmit}
            validate={validate}
          >
            {(formik) => (
              <Form>
                <Field name="name">
                  {({ field, form }: { field: any; form: any }) => (
                    <FormControl
                      mt={4}
                      isInvalid={form.errors.name && form.touched.name}
                    >
                      {/* <FormLabel>Name</FormLabel> */}
                      <Input
                        {...field}
                        _placeholder={{ color: 'gray.500' }}
                        type="text"
                        size="lg"
                        mb="4"
                        autoComplete="off"
                        focusBorderColor="blue.200"
                        // variant="flushed"
                        placeholder="Enter event name"
                      />
                      {form.errors.name && form.touched.name && (
                        <Text color="red.500">{form.errors.name}</Text>
                      )}
                    </FormControl>
                  )}
                </Field>
                <Field name="description">
                  {({ field, form }: { field: any; form: any }) => (
                    <FormControl
                      mt={4}
                      isInvalid={
                        form.errors.description && form.touched.description
                      }
                    >
                      {/* <FormLabel>Description</FormLabel> */}
                      <Textarea
                        {...field}
                        _placeholder={{ color: 'gray.500' }}
                        type="text"
                        size="lg"
                        mb="4"
                        height="fit-content"
                        autoComplete="off"
                        focusBorderColor="blue.400"
                        // variant="flushed"
                        placeholder="Enter event description"
                      />
                      {form.errors.description && form.touched.description && (
                        <Text color="red.500">{form.errors.description}</Text>
                      )}
                    </FormControl>
                  )}
                </Field>
                <Field name="supply">
                  {({ field, form }: { field: any; form: any }) => (
                    <FormControl
                      mt={4}
                      isInvalid={form.errors.supply && form.touched.supply}
                    >
                      {/* <FormLabel>Total Supply</FormLabel> */}
                      <Input
                        {...field}
                        _placeholder={{ color: 'gray.500' }}
                        type="number"
                        size="lg"
                        autoComplete="off"
                        mb="4"
                        focusBorderColor="blue.200"
                        // variant="flushed"
                        placeholder="Enter total ticket supply"
                      />
                      {form.errors.supply && form.touched.supply && (
                        <Text color="red.500">{form.errors.supply}</Text>
                      )}
                    </FormControl>
                  )}
                </Field>
                <Field name="price">
                  {({ field, form }: { field: any; form: any }) => (
                    <FormControl
                      mt={4}
                      isInvalid={form.errors.price && form.touched.price}
                    >
                      <Input
                        {...field}
                        _placeholder={{ color: 'gray.500' }}
                        type="number"
                        autoComplete="off"
                        size="lg"
                        mb="4"
                        focusBorderColor="blue.200"
                        placeholder={`Enter price per ticket in ${chain?.nativeCurrency.symbol}`}
                      />
                      {form.errors.price && form.touched.price && (
                        <Text color="red.500">{form.errors.price}</Text>
                      )}
                    </FormControl>
                  )}
                </Field>
                <Field name="image">
                  {({ field, form }: { field: any; form: any }) => (
                    <FormControl
                      my={6}
                      isInvalid={
                        !file && form.errors.image && form.touched.image
                      }
                    >
                      <FormLabel fontSize="lg">
                        Upload Event Cover Image
                      </FormLabel>
                      <Text color="blue.200">
                        Event cover image will be displayed to buyers.
                      </Text>

                      <>
                        {!file && !imageUrl && (
                          <Box
                            {...getRootProps()}
                            w="full"
                            mt={4}
                            bg="gray.900"
                            borderRadius="md"
                            justifyContent="center"
                            borderWidth={1}
                            borderStyle={isDragActive ? 'dashed' : 'solid'}
                            borderColor={
                              isDragAccept
                                ? 'blue.400'
                                : isDragReject
                                ? 'red.500'
                                : 'gray.700'
                            }
                            alignItems="center"
                            cursor="pointer"
                            p={4}
                          >
                            <Input
                              type="file"
                              {...field}
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
                            {!isDragActive && (
                              <Text textAlign="center" color="gray.500">
                                Drag and drop an image file here or click to
                                browse
                              </Text>
                            )}
                            <Box
                              mt={4}
                              display="flex"
                              justifyContent="center"
                              alignItems="center"
                              color="blue.200"
                            >
                              <FaImages size={48} />
                            </Box>
                          </Box>
                        )}
                        {imageUrl && (
                          <Box mt={4}>
                            <Box
                              display="flex"
                              flexDirection="column"
                              alignItems="flex-start"
                              position="relative"
                            >
                              <Box
                                w="full"
                                borderWidth="1px"
                                borderRadius="md"
                                overflow="hidden"
                              >
                                <Image
                                  src={imageUrl}
                                  w="full"
                                  h="full"
                                  objectFit="cover"
                                />
                              </Box>

                              <Box
                                position="absolute"
                                top="4"
                                right="4"
                                padding={2}
                                onClick={handleRemoveImage}
                                cursor="pointer"
                                backgroundColor="rgba(0, 0, 0, 0.5)"
                                borderRadius="50%"
                                transition="background-color 0.2s"
                                _hover={{
                                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                }}
                              >
                                <MdClose style={{ fontSize: '32px' }} />
                              </Box>
                            </Box>
                          </Box>
                        )}
                      </>

                      {!file && form.errors.image && form.touched.image && (
                        <Text mt={4} color="red.500">
                          {form.errors.image}
                        </Text>
                      )}
                    </FormControl>
                  )}
                </Field>
                <Field name="start">
                  {({ field, form }: { field: any; form: any }) => (
                    <FormControl mt={4} isInvalid={form.errors.start}>
                      <FormLabel>Event Start Date & Time</FormLabel>
                      <DatePicker
                        selected={startDate}
                        onChange={(date: any) => setStartDate(date)}
                        showTimeSelect
                        timeIntervals={15}
                        dateFormat="yyyy-MM-dd hh:mm aa"
                        placeholderText="Select date and time"
                        className="form-control"
                      />
                      {form.errors.start && (
                        <Text mt={4} color="red.500">
                          {form.errors.start}
                        </Text>
                      )}
                    </FormControl>
                  )}
                </Field>
                <Field name="end">
                  {({ field, form }: { field: any; form: any }) => (
                    <FormControl mt={4} isInvalid={form.errors.end}>
                      <FormLabel>Event End Date & Time</FormLabel>
                      <DatePicker
                        selected={endDate}
                        onChange={(date: any) => setEndDate(date)}
                        showTimeSelect
                        timeIntervals={15}
                        dateFormat="yyyy-MM-dd hh:mm aa"
                        placeholderText="Select date and time"
                        className="form-control"
                      />
                      {form.errors.end && (
                        <Text mt={4} color="red.500">
                          {form.errors.end}
                        </Text>
                      )}
                    </FormControl>
                  )}
                </Field>
                <Box display="flex" justifyContent="flex-end" mt={8}>
                  <Button
                    type="submit"
                    colorScheme="blue"
                    isLoading={isLoading}
                  >
                    Mint Event
                  </Button>
                </Box>
              </Form>
            )}
          </Formik>
        </Box>
      </Flex>
    </>
  );
}

export default CreateEvent;
