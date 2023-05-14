import {
  Avatar,
  AvatarBadge,
  Badge,
  Box,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { css } from '@emotion/react';
import { chain, isEmpty } from 'lodash';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useNetwork } from 'wagmi';
import { chainAddresses } from '../abi/address';
import ProfileABI from '../abi/ProfileImage.json';

interface CustomAvatarProps {
  size?: string;
  user: any;
  showBadge?: boolean;
  mr?: number;
  borderWidthRegularImage?: number;
  borderWidthNFTImage?: number;
}

const hexagonStyle = css`
  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  border: '4px solid #34D399',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center center',
  backgroundSize: 'cover',
`;

const CustomAvatar: React.FC<CustomAvatarProps> = ({
  size = 'md',
  user,
  showBadge,
  mr = 0,
  borderWidthRegularImage = 0,
  borderWidthNFTImage = 2,
}) => {
  const { chain } = useNetwork();
  //verify ownership of NFT image for profile picture
  const { data: useContractReadOwner } = useContractRead({
    address: chainAddresses[chain?.id].ProfileImage,
    abi: ProfileABI.output.abi,
    functionName: 'ownerOf',
    args: [user.nftId],
  });
  const [isNftHolder, SetIsNftHolder] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (
      user &&
      useContractReadOwner === user._id &&
      !isEmpty(user._id) &&
      !isEmpty(useContractReadOwner) &&
      user.nftId >= 0
    ) {
      SetIsNftHolder(true);
    } else {
      SetIsNftHolder(false);
    }
  }, [useContractReadOwner, user]);

  const {
    isOpen: isOpenProfile,
    onOpen: onOpenProfile,
    onClose: onCloseProfile,
  } = useDisclosure();

  return (
    <>
      {isOpenProfile && (
        <Modal isOpen={isOpenProfile} onClose={onCloseProfile}>
          <ModalOverlay />
          <ModalContent
            bgColor="gray.900"
            borderWidth="1px"
            maxH="60vh"
            overflow="auto"
            mx={4}
          >
            <ModalCloseButton />
            <ModalBody>
              <Image
                src={user.profileImage}
                fallbackSrc="/images/avatar-placeholder.png"
                alt={`Profile picture of ${user.name}`}
                borderRadius="full"
                objectFit="contain"
                width="100%"
                height="auto"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
      <Box
        onClick={() => {
          if (router.pathname.startsWith('/profile/')) {
            onOpenProfile();
          }
        }}
      >
        <Avatar
          name={user?.name}
          size={size}
          mr={mr}
          cursor="pointer"
          src={user.profileImage}
          borderWidth={
            isNftHolder ? borderWidthNFTImage : borderWidthRegularImage
          }
          borderStyle="solid"
          borderColor={isNftHolder ? 'blue.200' : 'white'}
          borderRadius={isNftHolder ? 0 : 'full'}
          css={isNftHolder && hexagonStyle}
        ></Avatar>
      </Box>
      {isNftHolder && showBadge && (
        <Badge colorScheme="blue">NFT Profile</Badge>
      )}
    </>
  );
};

export default CustomAvatar;
