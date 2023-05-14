type ChainAddresses = {
  [key: number | string]: {
    TicketFactory: `0x${string}`;
    ProfileImage: `0x${string}`;
  };
};

export const chainAddresses: ChainAddresses = {
  //polygon mumbai
  80001: {
    TicketFactory: '0x179E0e9bf9236f53E31dfad1BBAcdB3b8AA57A1e',
    ProfileImage: '0xBcc2b48EB362Fa35B0caCCA800A208007D319F88',
  },
};
