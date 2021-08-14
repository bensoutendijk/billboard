import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import localRoutes from './LocalRoutes';
import googleRoutes from './GoogleRoutes';
import auth from '../../../auth';
import { OAuthUserModel } from '../../../models/OAuthUser';

const router = express.Router();
const OAuthUser = mongoose.model('OAuthUser');

router.get('/users/:provider/:username', ...auth.required, async (req: Request, res: Response) => {
    const { user: { services } , params: { provider, username } } = req;

    const users = await OAuthUser.find({ _id: { $in: services } }) as OAuthUserModel[];

    const data = users.filter(user => (
        user.provider.toLowerCase() === provider.toLowerCase() &&
    user.data.username.toLowerCase() === username.toLowerCase()
    ));

    res.send(data.map(user => ({
        _id: user._id,
        data: user.data,
        provider: user.provider,
    })));
});

router.get('/users', ...auth.required, async (req: Request, res: Response) => {
    const { user: { services } } = req;

    const users = await OAuthUser.find({ _id: { $in: services } }) as OAuthUserModel[];

    const data = users.map(user => ({
        _id: user._id,
        data: user.data,
        provider: user.provider,
    }));

    res.send(data);
});

router.use('/local', localRoutes);
router.use('/google', googleRoutes);

export default router;
