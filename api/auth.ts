import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async (req: VercelRequest, res: VercelResponse) => {
  const code = req.query.code;
  const clientId = process.env.VITE_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  
  const tokenResponse = await axios.post(`https://github.com/login/oauth/access_token`, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
  }, {
    headers: {
      Accept: 'application/json',
    },
  });

  const accessToken = tokenResponse.data.access_token;
  // Here, you can use the access token to perform actions on behalf of the user.
  // For example, writing to a repository specified by the user.

  res.redirect(`https://flatironinstitute.github.io/neurosift?p=/neurosift-annotations-login&access_token=${accessToken}`);
};
