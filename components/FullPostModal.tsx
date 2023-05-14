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
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
  Textarea,
  Tooltip,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import axios from 'axios';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import { FaCommentSlash, FaTrash } from 'react-icons/fa';
import { useAccount } from 'wagmi';
import client from '../lib/sanityFrontendClient';
import CustomAvatar from './CustomAvatar';
import { PostProps } from './Posts';

type FullPostModalProps = {
  isOpenPostModal: boolean;
  onClosePostModal: () => void;
  post: PostProps;
  like: any;
  unlike: any;
  isLiked: any;
  likeCount: any;
};

function formatDate(dateString: string): string {
  const createdAt = dayjs(dateString);
  let formattedDate: string;

  if (dayjs().diff(createdAt, 'day') >= 1) {
    formattedDate = createdAt.format('MMMM D, YYYY');
  } else {
    formattedDate = createdAt.fromNow();
    formattedDate = formattedDate.replace(' ago', '');
    formattedDate = formattedDate.replace(/(\d+) days?/, '$1d');
    formattedDate = formattedDate.replace(/(\d+) hours?/, '$1h');
    formattedDate = formattedDate.replace(/(\d+) minutes?/, '$1m');
    formattedDate = formattedDate.replace(/(\d+) seconds?/, '$1s');
  }

  return formattedDate;
}

function FullPostModal({
  isOpenPostModal,
  onClosePostModal,
  post,
  like,
  unlike,
  isLiked,
  likeCount,
}: FullPostModalProps) {
  const { address } = useAccount();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const [comment, setComment] = useState<string | null>(null);

  const [comments, setComments] = useState<any[]>([]);

  const [deleteCommentKey, setDeleteCommentKey] = useState<string | null>(null);

  useEffect(() => {
    if (!post._id) {
      return;
    }
    console.log(post._id);
    setIsFetching(true);
    const query = `*[_type == "posts" && _id == $postId][0] {
      "comments": comments[] {
        ...,
        "commenter": commenter-> {
          ..., 
        }
      }
    }`;
    client
      .fetch(query, { postId: post._id })
      .then((res) => {
        setComments(res.comments);
      })
      .catch((error: any) => {
        console.error(error);
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [post._id]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };
  const submitHandler = async () => {
    if (!comment) {
      return;
    }
    try {
      setIsLoading(true);
      const response = await axios.post('/api/post/comment', {
        postId: post._id,
        commenterAddress: address,
        content: comment,
      });
      const newComment = response.data;
      console.log(comments);
      console.log(newComment);
      setComments((prev: any) => {
        if (Array.isArray(prev)) {
          return [newComment, ...prev];
        } else {
          return [newComment];
        }
      });
    } catch (error) {
    } finally {
      setIsLoading(false);
      setComment('');
    }
  };

  //delete comment modal handlers
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const deleteCommentHandler = async () => {
    if (!deleteCommentKey) {
      return;
    }
    onClose();
    try {
      setIsLoading(true);
      const response = await axios.post('/api/post/delete_comment', {
        postId: post._id,
        deleteCommentKey: deleteCommentKey,
      });
      const deleted_key = response.data;
      console.log(deleted_key);
      setComments((prev: any) => {
        return prev.filter((comment: any) => comment._key !== deleted_key);
      });
    } catch (error) {
    } finally {
      setIsLoading(false);
      setDeleteCommentKey(null);
    }
  };

  return (
    <>
      <Modal
        blockScrollOnMount={true}
        size="3xl"
        isOpen={isOpenPostModal}
        onClose={() => {
          onClosePostModal();
          setIsLoading(false);
        }}
        isCentered
      >
        <ModalOverlay />
        <>
          <AlertDialog
            isOpen={isOpen}
            leastDestructiveRef={cancelRef}
            onClose={onClose}
            isCentered
          >
            <AlertDialogOverlay>
              <AlertDialogContent mx={4} bg="gray.900">
                <AlertDialogHeader fontSize="lg" fontWeight="bold">
                  Delete Comment
                </AlertDialogHeader>

                <AlertDialogBody>
                  Are you sure? You can&apos;t undo this action afterwards.
                </AlertDialogBody>

                <AlertDialogFooter>
                  <Button ref={cancelRef} onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    colorScheme="blue"
                    onClick={deleteCommentHandler}
                    ml={3}
                  >
                    Delete
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialogOverlay>
          </AlertDialog>
          <ModalContent
            bgColor="gray.900"
            maxH="80vh"
            maxW="3xl"
            overflow="auto"
            mx={4}
            borderWidth="1px"
          >
            <ModalHeader>Post</ModalHeader>
            <ModalCloseButton />
            <ModalBody mb={8}>
              <Flex direction="row">
                <Link href={`/profile/${post.author?.walletAddress}`}>
                  {post.author && <CustomAvatar user={post.author} mr={4} />}
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
                      <Text color="gray.500" ml="1">
                        {formatDate(post._createdAt)}
                      </Text>

                      <Box display={{ base: 'none', md: 'block' }}>
                        <Text color="gray.500">
                          &middot; @{post.author?.walletAddress?.slice(0, 6)}
                          ....
                          {post.author?.walletAddress?.slice(-6)}
                        </Text>
                      </Box>
                    </HStack>
                  </Flex>
                  <Box display={{ base: 'block', md: 'none' }} mt="2">
                    <Text color="gray.500">
                      @{post.author?.walletAddress?.slice(0, 6)}....
                      {post.author?.walletAddress?.slice(-6)}
                    </Text>
                  </Box>

                  <Text fontWeight="medium">{post.text}</Text>

                  {post.postImage && (
                    <Box
                      // w="100%"
                      borderWidth="1px"
                      borderRadius="md"
                      overflow="hidden"
                    >
                      <Image
                        src={post.postImage}
                        alt="Post image"
                        w="auto"
                        h={300}
                        objectFit="cover"
                        placeholder="blur"
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
                  </Flex>
                  <Box borderRadius="md" w="full">
                    <Heading as="h3" size="md" mb={4}>
                      Comments {comments?.length ? `(${comments?.length})` : ''}
                    </Heading>

                    {/* comments section */}
                    <VStack spacing={4} align="stretch">
                      <>
                        {/* add comment */}
                        <Box bgColor="gray.700" p={4} borderRadius="md">
                          <Textarea
                            onChange={handleCommentChange}
                            placeholder="Add a comment..."
                            value={comment || ''}
                            focusBorderColor="blue.200"
                          />
                          <Flex justify="flex-end">
                            <Button
                              colorScheme="blue"
                              isDisabled={comment?.length === 0}
                              size="sm"
                              mt={2}
                              onClick={submitHandler}
                              isLoading={isLoading}
                            >
                              Comment
                            </Button>
                          </Flex>
                        </Box>
                        {/* comments */}
                        {isFetching && <Spinner size="sm" />}
                        {!isFetching &&
                          comments &&
                          comments?.map((comment: any) => {
                            return (
                              <Box
                                key={comment?._key}
                                bgColor="gray.700"
                                p={4}
                                borderRadius="md"
                              >
                                {' '}
                                <Flex direction="row">
                                  <Link
                                    onClick={() => {
                                      onClosePostModal();
                                    }}
                                    href={`/profile/${comment?.commenter?._id}`}
                                  >
                                    {comment?.commenter && (
                                      <CustomAvatar
                                        user={comment?.commenter}
                                        mr={4}
                                      />
                                    )}
                                  </Link>
                                  <Flex direction="column">
                                    <Flex direction="row" mb={2}>
                                      <Link
                                        onClick={() => {
                                          onClosePostModal();
                                        }}
                                        href={`/profile/${comment?.commenter?._id}`}
                                      >
                                        <Text
                                          color="gray.500"
                                          _hover={{
                                            textDecoration: 'underline',
                                          }}
                                        >
                                          {comment?.commenter?._id?.slice(0, 6)}
                                          ....
                                          {comment?.commenter?._id?.slice(-6)}
                                        </Text>
                                      </Link>
                                      <Text color="gray.500">
                                        &nbsp;&middot;&nbsp;
                                        {formatDate(comment?.createdAt)}
                                      </Text>
                                    </Flex>
                                    <Text>{comment?.content}</Text>
                                  </Flex>
                                  <Flex
                                    flexGrow="1"
                                    h="full"
                                    alignItems="flex-start"
                                    justifyContent="end"
                                  >
                                    {comment?.commenter?._id === address && (
                                      <>
                                        <Tooltip
                                          label="Delete comment"
                                          placement="top"
                                        >
                                          <Button
                                            onClick={() => {
                                              onOpen();
                                              setDeleteCommentKey(comment._key);
                                            }}
                                            alignSelf="flex-end"
                                            variant="ghost"
                                            colorScheme="red"
                                            size="sm"
                                            aria-label="Delete post"
                                          >
                                            <Icon as={FaTrash} boxSize={4} />
                                          </Button>
                                        </Tooltip>
                                      </>
                                    )}
                                  </Flex>
                                </Flex>
                              </Box>
                            );
                          })}
                      </>
                    </VStack>
                  </Box>
                </VStack>
              </Flex>
            </ModalBody>
          </ModalContent>
        </>
      </Modal>
    </>
  );
}

export default FullPostModal;
