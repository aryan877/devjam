import {
  Avatar,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import {
  useAccount,
  useNetwork,
  usePrepareSendTransaction,
  useSendTransaction,
  useWaitForTransaction,
} from 'wagmi';

function TransferModal({ isOpen, onClose, user }: any) {
  const [amount, setAmount] = useState<string>('');
  const { address } = useAccount();

  const handleAmountChange = (e: any) => {
    let value = e.target.value.trim();
    if (value === '' || /^(0|[1-9]\d*)(\.\d{0,18})?$/.test(value)) {
      setAmount(value);
    }
  };
  const { chain } = useNetwork();

  const { config, error, isError } = usePrepareSendTransaction({
    request: {
      to: user?._id,
      value: ethers.utils.parseUnits(amount || '0'),
    },
  });
  const { sendTransaction, data } = useSendTransaction(config);

  const {
    data: useWaitForTransactionData,
    isSuccess,
    isFetching,
    isError: useWaitForTransactionError,
  } = useWaitForTransaction({
    hash: data?.hash,
  });

  return (
    <Modal
      isCentered
      blockScrollOnMount={true}
      isOpen={isOpen}
      onClose={() => {
        onClose();
      }}
    >
      <ModalOverlay />
      <ModalContent
        mx={4}
        bgColor="gray.900"
        borderWidth="1px"
        maxH="60vh"
        overflow="auto"
      >
        <ModalHeader>Transfer Amount</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text fontWeight="bold" mb={2} color="blue.200">
            Transferring amount to {user?.name}
          </Text>
          {address && (
            <Text fontSize="md" mb={4} color="gray.400">
              From: @{address.slice(0, 8)}....{address.slice(-8)}
            </Text>
          )}
          <Text fontSize="md" mb={4} color="gray.400">
            To: @{user?._id.slice(0, 8)}....{user?._id.slice(-8)}
          </Text>

          <Input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            width="4rem"
            textAlign="center"
            borderRadius="md"
            mr={2}
            w="full"
            fontSize="lg"
            _placeholder={{ color: 'gray.400' }}
            placeholder={`Enter amount to send in ${chain?.nativeCurrency.symbol}`}
            style={{ minWidth: 0 }}
            focusBorderColor="blue.200"
          />
        </ModalBody>

        <ModalFooter flexDirection="column" alignItems="flex-end">
          <Button
            colorScheme="blue"
            isDisabled={!amount || isError}
            onClick={() => {
              sendTransaction?.();
            }}
            isLoading={isFetching}
          >
            Send
          </Button>
          {useWaitForTransactionError && (
            <Text color="red.500">
              Error, could not complete transaction, try again.
            </Text>
          )}
          <Box mt={4} w="full">
            {isFetching ? (
              <Text>Transaction pending....</Text>
            ) : isSuccess ? (
              <Text color="blue.200">
                Transaction successful. Amount has been transferred.
              </Text>
            ) : (
              <></>
            )}
          </Box>
          {error && (
            <Text color="red.500" w="full" mt={2}>
              {error?.message === 'Internal JSON-RPC error.'
                ? 'Error, check if you have enough balance'
                : `An error occurred preparing the transaction: ${error?.message?.slice(
                    0,
                    300
                  )} ${error?.message?.length > 300 ? '....' : ''}`}
            </Text>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default TransferModal;
