import express, { Request, Response } from 'express';
import auth from '../../middlewares/auth.middleware';

const router = express.Router();

// POST new user route (optional, everyone has access)
router.post('/', ...auth.optional, async (req: Request, res: Response) => {
  const { email, password, passwordConfirmation } = req.body;

  try {
    const user = await handleCreateUser(email, password, passwordConfirmation);
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST login route (optional, everyone has access)
router.post('/login', ...auth.optional, (req: Request, res: Response, next: NextFunction) => {
  const { status, body } = handleLogin(req.body);
  res.status(status).json(body);
});


// GET current route (required, only authenticated users have access)
router.get('/current', ...auth.required, async (req: Request, res: Response) => {
  const { user } = req;

  try {
    const localUser = await LocalUser.findOne({ _id: user._id });

    if (localUser === null) {
      throw new Error('user not found');
    }

    res.cookie('httpOnlyToken', `Token ${localUser.generateHttpOnlyJWT()}`, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      httpOnly: true,
    });
    res.cookie('token', `Token ${localUser.generateJWT()}`, {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });

    return res.json(localUser.toJSON());
  } catch (error) {
    return res.status(400).json(error.message);
  }
});

export default router;
