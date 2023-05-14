import { ProtocolEnum, SpheronClient } from '@spheron/storage';
import formidable from 'formidable';
import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiRequest, NextApiResponse } from 'next';
import client from '../../../../lib/sanityBackendClient';
import { ironOptions } from '../../../../utils';
const sphToken = process.env.SPHERON_TOKEN as string;
const sphClient = new SpheronClient({ token: sphToken });
let currentlyUploaded = 0;
export const config = {
  api: {
    bodyParser: false,
  },
};
const readForm = (
  req: NextApiRequest,
  saveLocally?: boolean
): Promise<{ fields: formidable.Fields; files: any }> => {
  const options: formidable.Options = {};
  if (saveLocally) {
    options.uploadDir = '/tmp';
    options.filename = (name, ext, path, form) => {
      return Date.now().toString() + '_' + path.originalFilename;
    };
  }
  options.maxFileSize = 10000 * 1024 * 1024;
  const form = formidable(options);
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

const updateProfile = async (req: NextApiRequest, res: NextApiResponse) => {
  //verify wallet signature here, only if signature is valid then the user can post
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }
    if (!req.session.siwe?.address) {
      return res.status(422).json({ message: 'Invalid token' });
    }
    const { fields, files } = await readForm(req, true);
    if (!fields.name) {
      return res.status(406).json({
        message: 'name cannot be blank',
      });
    }
    let postImage = '';
    if (files.image) {
      const { uploadId, bucketId, protocolLink, dynamicLinks } =
        await sphClient.upload(`${files.image.filepath}`, {
          protocol: ProtocolEnum.FILECOIN,
          name: files.image.newFilename,
          onUploadInitiated: (uploadId) => {},
          onChunkUploaded: (uploadedSize, totalSize) => {
            currentlyUploaded += uploadedSize;
          },
        });
      postImage = `${protocolLink}/${files.image.newFilename}`; // set postImage to the uploaded image link
      const response = await client
        .patch(req.session.siwe.address)
        .set({ profileImage: postImage })
        .set({ name: fields.name })
        .unset(['nftId']) // remove the nftId property
        .commit();
      return res.status(201).json({ response });
    }

    const response = await client
      .patch(req.session.siwe.address)
      .set({ name: fields.name })
      .commit();
    return res.status(201).json({ response });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default withIronSessionApiRoute(updateProfile, ironOptions);
