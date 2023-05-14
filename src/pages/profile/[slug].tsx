import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Image,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { css } from '@emotion/react';
import dayjs from 'dayjs';
import { utils } from 'ethers';
import { isEmpty } from 'lodash';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useAccount, useContractRead, useNetwork } from 'wagmi';
import { chainAddresses } from '../../../abi/address';
import TicketABI from '../../../abi/TicketFactory.json';
import CustomAvatar from '../../../components/CustomAvatar';
import EditProfile from '../../../components/EditProfileModal';
import Event from '../../../components/Event';
import Posts, { PostProps } from '../../../components/Posts';
import TransferModal from '../../../components/TransferModal';
import { useNotification } from '../../../context/NotificationContext';
import client from '../../../lib/sanityFrontendClient';

const hexagonStyle = css`
clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
border: '4px solid #34D399',
backgroundRepeat: 'no-repeat',
backgroundPosition: 'center center',
backgroundSize: 'cover',
`;

interface User {
  _type: 'users';
  _id: string;
  name: string;
  profileImage?: string;
  walletAddress: string;
  _createdAt: Date;
  nftId: number;
}
function Profile() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [update, setUpdate] = useState<Boolean>(false);
  // const [isNftHolder, SetIsNftHolder] = useState(false);

  const [tabIndex, setTabIndex] = useState(0);
  const handleTabsChange = (index: number) => {
    setTabIndex(index);
  };

  const { chain } = useNetwork();

  const slug = router.query.slug;
  const { addNotification } = useNotification();
  const { address } = useAccount();

  const [events, setEvents] = useState<any>([]);
  const { data: useContractReadEvents, isFetching } = useContractRead({
    address: chainAddresses[chain?.id].TicketFactory,
    abi: TicketABI.output.abi,
    functionName: 'getMyEvents',
    overrides: {
      from: `0x${router.query.slug?.slice(2)}`,
    },
  });

  useEffect(() => {
    setEvents(useContractReadEvents);
  }, [useContractReadEvents]);

  useEffect(() => {
    if (tabIndex !== 0) {
      return;
    }
    const getPosts = async () => {
      try {
        setIsLoadingPosts(true);
        const postsQuery = `*[ _type == "posts" && author._ref == $authorRef ]{
          ...,
          author->{
            ...
          }
        }`;
        const posts = await client.fetch(postsQuery, { authorRef: slug });
        setPosts(posts);
        setIsLoadingPosts(false);
      } catch (error) {
        setIsLoadingPosts(false);
        addNotification({
          status: 'error',
          title: 'An Error Occurred',
          description: 'Error occurred while fetching user posts',
          autoClose: true,
        });
      }
    };
    getPosts();
  }, [slug, update, tabIndex]);

  useEffect(() => {
    const getUser = async () => {
      try {
        setIsLoadingUser(true);
        const userQuery = `*[ _type == "users" && _id == $slug ][0]`;
        const user = await client.fetch(userQuery, { slug });
        setUser(user);
        setIsLoadingUser(false);
      } catch (error) {
        setIsLoadingUser(false);
        addNotification({
          status: 'error',
          title: 'An Error Occurred',
          description: 'Error occurred while fetching user data',
          autoClose: true,
        });
      }
    };
    getUser();
  }, [slug, update]);

  const {
    isOpen: editProfileIsOpen,
    onOpen: editProfileOnOpen,
    onClose: editProfileOnClose,
  } = useDisclosure();

  const {
    isOpen: transferIsOpen,
    onOpen: transferOnOpen,
    onClose: transferOnClose,
  } = useDisclosure();

  return (
    <>
      {user && editProfileIsOpen && (
        <EditProfile
          isOpen={editProfileIsOpen}
          onClose={editProfileOnClose}
          user={user}
          setUpdate={setUpdate}
        />
      )}
      {user && transferIsOpen && (
        <TransferModal
          isOpen={transferIsOpen}
          onClose={transferOnClose}
          user={user}
        />
      )}
      <Box width="full" mb={16} maxWidth="2xl" p={4}>
        <Button
          colorScheme="blue"
          // bg="gray.700"
          mb={4}
          w="fit-content"
          onClick={() => router.back()}
        >
          <FiArrowLeft />
          <Text ml={2}>Back</Text>
        </Button>

        {!isLoadingUser ? (
          <>
            <VStack alignItems="flex-start" my="4">
              {user && (
                <CustomAvatar
                  size="2xl"
                  borderWidthRegularImage={2}
                  user={user}
                  showBadge={true}
                />
              )}
            </VStack>
            <Text fontSize="xl" fontWeight="bold">
              {user?.name}
            </Text>
            <Text mt={2} color="gray.500">
              @{user?._id}
            </Text>
            <Text color="gray.500">
              joined on {dayjs(user?._createdAt).format('MMMM D, YYYY')}
            </Text>
            {address === slug ? (
              <>
                <Button
                  mt={4}
                  borderRadius="lg"
                  borderWidth="1px"
                  bg="gray.800"
                  _hover={{ bg: 'gray.800' }}
                  borderColor="blue.200"
                  color="blue.200"
                  onClick={editProfileOnOpen}
                >
                  Edit Profile
                </Button>
              </>
            ) : (
              <Button
                mt={4}
                borderRadius="lg"
                borderWidth="1px"
                bg="gray.800"
                _hover={{ bg: 'gray.800' }}
                borderColor="blue.200"
                color="blue.200"
                onClick={transferOnOpen}
              >
                Send {chain?.nativeCurrency.symbol}
              </Button>
            )}
          </>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center">
            <Spinner size="xl" color="gray.500" />
          </Box>
        )}
        <Tabs
          index={tabIndex}
          onChange={handleTabsChange}
          isFitted
          variant="enclosed"
          colorScheme="blue"
        >
          <TabList my={8}>
            <Tab>Posts</Tab>
            <Tab>Events</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} py={0}>
              {isLoadingPosts ? (
                <Box display="flex" justifyContent="center" alignItems="center">
                  <Spinner size="xl" color="gray.500" />
                </Box>
              ) : (
                <>
                  {posts.length > 0 ? (
                    <VStack alignItems="start" spacing="4">
                      <Posts posts={posts} setPosts={setPosts} />
                    </VStack>
                  ) : (
                    <VStack justifyContent="center" alignItems="center">
                      <Text
                        fontSize="lg"
                        fontWeight="medium"
                        color="gray.500"
                        textAlign="center"
                        mt="8"
                        mb="4"
                      >
                        {slug === address
                          ? "It looks like you haven't made any posts yet."
                          : "It looks like this user hasn't made any posts yet."}
                      </Text>
                      {slug === address && (
                        <Link href="/">
                          <Button variant="solid" colorScheme="blue">
                            Create a new post
                          </Button>
                        </Link>
                      )}
                    </VStack>
                  )}
                </>
              )}
            </TabPanel>
            <TabPanel px={0} py={0}>
              {isFetching ? (
                <Box display="flex" justifyContent="center" alignItems="center">
                  <Spinner size="xl" color="gray.500" />
                </Box>
              ) : (
                <Box width="full" maxWidth="2xl" p={4}>
                  <VStack spacing={4} alignItems="stretch">
                    {events && isEmpty(events) && (
                      <>
                        <Text
                          fontSize="lg"
                          fontWeight="medium"
                          color="gray.500"
                          textAlign="center"
                          mt="8"
                          mb="4"
                        >
                          {slug === address
                            ? "It looks like you haven't created any events yet."
                            : "It looks like the user hasn't created any events yet."}
                        </Text>
                      </>
                    )}
                    {events?.map((event: any) => {
                      return <Event key={event[0]} event={event} />;
                    })}
                  </VStack>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </>
  );
}

export default Profile;
