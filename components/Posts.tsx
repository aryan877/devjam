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
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Image,
  Stack,
  Text,
  Tooltip,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import relativeTime from 'dayjs/plugin/relativeTime';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import { FaTrash } from 'react-icons/fa';
import { useAccount } from 'wagmi';
import { useNotification } from '../context/NotificationContext';
import CustomAvatar from './CustomAvatar';
import FullPostModal from './FullPostModal';

dayjs.locale('en');
dayjs.extend(relativeTime);

export interface PostProps {
  text: string;
  _id: string;
  _createdAt: string;
  postImage: string;
  likes: any[];
  comments: any[];
  author: {
    walletAddress: string;
    name: string;
    profileImage: string;
    nftId: string;
  };
}

function Post({
  post,
  index,
  length,
  setPosts,
}: {
  post: PostProps;
  index: number;
  length: number;
  setPosts: React.Dispatch<React.SetStateAction<PostProps[]>>;
}) {
  const [isLiked, setIsLiked] = useState<boolean>(false);

  useEffect(() => {
    const liked = post.likes.some(
      (like: { _ref: string }) => like._ref === address
    );
    setIsLiked(liked);
  }, [post.likes]);

  const [likeCount, setLikeCount] = useState<number>(post?.likes?.length || 0);
  const like = async () => {
    try {
      setLikeCount((prev) => prev + 1);
      setIsLiked(true);
      const res = await axios.post('/api/post/like', {
        id: post._id,
      });
      // addNotification({
      //   status: 'success',
      //   title: res.data.message,
      //   autoClose: true,
      // });
    } catch (error: any) {
      console.log(error?.response?.data?.message);
      setIsLiked(false);
      setLikeCount((prev) => prev - 1);
    }
  };
  const unlike = async () => {
    try {
      setLikeCount((prev) => prev - 1);
      setIsLiked(false);
      const res = await axios.post('/api/post/unlike', {
        id: post._id,
      });
    } catch (error) {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  const createdAt = dayjs(post._createdAt);

  let createdAtFormatted;
  if (dayjs().diff(createdAt, 'day') >= 1) {
    createdAtFormatted = createdAt.format('MMMM D, YYYY');
  } else {
    createdAtFormatted = createdAt.fromNow();
    createdAtFormatted = createdAtFormatted.replace(' ago', '');
    createdAtFormatted = createdAtFormatted.replace(/(\d+) days?/, '$1d');
    createdAtFormatted = createdAtFormatted.replace(/(\d+) hours?/, '$1h');
    createdAtFormatted = createdAtFormatted.replace(/(\d+) minutes?/, '$1m');
    createdAtFormatted = createdAtFormatted.replace(/(\d+) seconds?/, '$1s');
  }
  const { addNotification } = useNotification();
  const { address } = useAccount();

  const deleteHandler = async () => {
    addNotification({ status: 'info', title: 'Deleting post...' });
    try {
      onClose();
      const res = await axios.post('/api/post/delete', {
        id: post._id,
      });
      setPosts((prevState) => prevState.filter((p) => p._id !== post._id));
      addNotification({
        status: 'success',
        title: res.data.message,
        autoClose: true,
      });
    } catch (error: any) {
      onClose();
      addNotification({
        status: 'error',
        title: error.response.data.message,
        autoClose: true,
      });
    }
  };

  //delete post modal handlers
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  //
  //full post view modal handlers
  const {
    onOpen: onOpenPostModal,
    isOpen: isOpenPostModal,
    onClose: onClosePostModal,
  } = useDisclosure();

  return (
    <>
      {post && isOpenPostModal && (
        <FullPostModal
          like={like}
          unlike={unlike}
          isLiked={isLiked}
          likeCount={likeCount}
          post={post}
          isOpenPostModal={isOpenPostModal}
          onClosePostModal={onClosePostModal}
        />
      )}
      <Flex
        bg="gray.900"
        borderLeftWidth="1px"
        borderRightWidth="1px"
        borderBottomWidth="1px"
        borderTopWidth={0 === index ? '1px' : 'none'}
        borderBottomRightRadius={length - 1 === index ? 'md' : 'none'}
        borderBottomLeftRadius={length - 1 === index ? 'md' : 'none'}
        borderTopRightRadius={0 === index ? 'md' : 'none'}
        borderTopLeftRadius={0 === index ? 'md' : 'none'}
        p={4}
        align="start"
      >
        <Link href={`/profile/${post.author?.walletAddress}`}>
          {post.author && <CustomAvatar mr={4} user={post.author} />}
        </Link>
        <VStack align="start" w="100%">
          <Flex w="100%" justifyContent="space-between">
            <HStack w="100%">
              <Link href={`/profile/${post.author?.walletAddress}`}>
                <Text
                  fontWeight="bold"
                  _hover={{ textDecoration: 'underline' }}
                >
                  {post.author?.name}
                </Text>
              </Link>

              <Box display={{ base: 'none', md: 'block' }}>
                <Link href={`/profile/${post.author?.walletAddress}`}>
                  <Text color="gray.500">
                    @{post.author?.walletAddress?.slice(0, 6)}....
                    {post.author?.walletAddress?.slice(-6)} &middot;
                  </Text>
                </Link>
              </Box>
              <Text color="gray.500" ml="1">
                {createdAtFormatted}
              </Text>
            </HStack>
            {post.author?.walletAddress === address && (
              <>
                <Tooltip label="Delete post" placement="top">
                  <Button
                    onClick={onOpen}
                    alignSelf="flex-end"
                    variant="ghost"
                    colorScheme="red"
                    size="sm"
                    aria-label="Delete post"
                  >
                    <Icon as={FaTrash} boxSize={4} />
                  </Button>
                </Tooltip>

                <AlertDialog
                  isOpen={isOpen}
                  leastDestructiveRef={cancelRef}
                  onClose={onClose}
                  isCentered
                >
                  <AlertDialogOverlay>
                    <AlertDialogContent mx={4} bg="gray.900">
                      <AlertDialogHeader fontSize="lg" fontWeight="bold">
                        Delete Post
                      </AlertDialogHeader>

                      <AlertDialogBody>
                        Are you sure? You can't undo this action afterwards.
                      </AlertDialogBody>

                      <AlertDialogFooter>
                        <Button ref={cancelRef} onClick={onClose}>
                          Cancel
                        </Button>
                        <Button
                          colorScheme="blue"
                          onClick={deleteHandler}
                          ml={3}
                        >
                          Delete
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialogOverlay>
                </AlertDialog>
              </>
            )}
          </Flex>
          <Box display={{ base: 'block', md: 'none' }} mt="2">
            <Text color="gray.500">
              @{post.author?.walletAddress?.slice(0, 6)}....
              {post.author?.walletAddress?.slice(-6)}
            </Text>
          </Box>

          <Text fontWeight="medium">{post.text}</Text>

          {post.postImage && (
            <Box w="100%" borderWidth="1px" borderRadius="md" overflow="hidden">
              <Image
                src={post.postImage}
                alt="Post image"
                w="full"
                h="auto"
                cursor="pointer"
                objectFit="cover"
                placeholder="blur"
                onClick={() => {
                  onOpenPostModal();
                }}
              />
            </Box>
          )}
          <Flex justify="space-between" w="100%" alignItems="center">
            <HStack>
              {/* like button */}
              <IconButton
                icon={
                  isLiked ? (
                    <AiFillHeart size={25} />
                  ) : (
                    <AiOutlineHeart size={25} />
                  )
                }
                colorScheme={'red'}
                color={isLiked ? 'red.400' : 'white'}
                variant="unstyled"
                aria-label="Like"
                _hover={{ color: 'red.400' }}
                onClick={() => {
                  if (isLiked) {
                    unlike();
                  } else {
                    like();
                  }
                }}
              />
              {/* like button */}
              <Text mr={-2} color="white">
                {' '}
                {likeCount}
              </Text>
            </HStack>
            <Text
              onClick={onOpenPostModal}
              color="gray.500"
              cursor="pointer"
              p={2}
              borderRadius="md"
              _hover={{ bg: 'gray.700' }}
            >
              View {post.comments?.length} Comments
            </Text>
          </Flex>
        </VStack>
      </Flex>
    </>
  );
}

function Posts({
  posts,
  setPosts,
}: {
  posts: PostProps[];
  setPosts: React.Dispatch<React.SetStateAction<PostProps[]>>;
}) {
  return (
    <Flex mt={2} width="full" align="stretch" flexDirection="column">
      {posts.map((post, index) => (
        <Post
          setPosts={setPosts}
          key={post._id}
          post={post}
          index={index}
          length={posts.length}
        />
      ))}
    </Flex>
  );
}

export default Posts;
