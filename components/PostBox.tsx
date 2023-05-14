import {
  Box,
  Button,
  Container,
  Flex,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Tooltip,
} from '@chakra-ui/react';
import axios from 'axios';
import React, { useState } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { IoImagesOutline } from 'react-icons/io5';
import { MdClose } from 'react-icons/md';
// import { useSignMessage } from 'wagmi';
import { useAccount } from 'wagmi';
import { useNotification } from '../context/NotificationContext';
import { PostProps } from './Posts';

export interface setPostProps {
  setPosts: React.Dispatch<React.SetStateAction<PostProps[]>>;
}

const PostBox = ({ setPosts }: setPostProps) => {
  const [value, setValue] = useState('');
  const [file, setFile] = useState<File | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const { addNotification } = useNotification();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { address } = useAccount();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData();
    if (file) {
      formData.append('image', file);
    }
    if (value) {
      formData.append('text', value);
    }

    setIsLoading(true);
    //send signature along with current user address to authorize on backend
    axios
      .post('/api/post/create', formData)
      .then((res) => {
        setPosts((prevPosts: PostProps[]) => {
          return [{ ...res.data.postWithAuthor }, ...prevPosts];
        });
        addNotification({
          status: 'success',
          title: 'Post Created',
          description: '',
          autoClose: true,
        });
        //remove file
        setImageUrl(undefined);
        setFile(undefined);
        //reset value
        setValue('');
      })
      .catch((error) => {
        addNotification({
          status: 'error',
          title: 'Error',
          description: error.response.data.message,
          autoClose: true,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleRemoveImage = () => {
    setImageUrl(undefined);
    setFile(undefined);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const file = files[0];
      if (file) {
        setFile(file);
        setImageUrl(URL.createObjectURL(file));
      }
    }
  };

  return (
    <Container
      backgroundColor="gray.900"
      display="flex"
      p="4"
      width="full"
      maxWidth="2xl"
      borderRadius="md"
      borderWidth="1px"
      alignItems="start"
      justifyItems="start"
    >
      <Box as={FaUserCircle} size={50} mr="4" />
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <InputGroup>
          <Input
            type="text"
            placeholder="Share your thoughts"
            value={value}
            size="lg"
            mb="4"
            focusBorderColor="blue.200"
            _placeholder={{ color: 'gray.500' }}
            variant="flushed"
            onChange={(event) => setValue(event.target.value)}
          />
        </InputGroup>
        <Flex direction="row" align="center" justify="space-between">
          <Tooltip label="Upload media" aria-label="upload media">
            <Button
              as="label"
              htmlFor="fileInput"
              variant="custom"
              cursor="pointer"
              color="blue.400"
              size="sm"
              minWidth="0"
              padding="0"
            >
              <IoImagesOutline size={20} style={{ margin: 0, padding: 0 }} />
              <Input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </Button>
          </Tooltip>

          <Button
            type="submit"
            variant="custom"
            mt="2"
            justifyContent="center"
            alignItems="center"
            backgroundColor="blue.400"
            visibility={value || imageUrl ? 'visible' : 'hidden'}
            disabled={isLoading} // Disable the button when loading is true
            isLoading={isLoading}
          >
            Post
            {/* {isLoading ? <Spinner size="sm" /> : 'Post'} */}
          </Button>
        </Flex>
        {imageUrl && (
          <Box mt="4" position="relative">
            <Box w="full" borderWidth="1px" borderRadius="md" overflow="hidden">
              <Image src={imageUrl} w="full" h="full" objectFit="cover" />
            </Box>
            <Box
              position="absolute"
              top="4"
              right="4"
              padding="4px"
              onClick={handleRemoveImage}
              cursor="pointer"
              backgroundColor="rgba(0, 0, 0, 0.5)"
              borderRadius="50%"
              transition="background-color 0.2s"
              _hover={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
            >
              <MdClose style={{ fontSize: '32px' }} />
            </Box>
          </Box>
        )}
      </form>
    </Container>
  );
};

export default PostBox;
