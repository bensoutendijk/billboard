import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import auth from '../../../auth';
import Card from '../../../models/Card';
import LocalUser from '../../../models/LocalUser';
import Board, { BoardForm } from '../../../models/Board';
import Category from '../../../models/Category';

const router = express.Router();

const User = mongoose.model<LocalUser>('LocalUser');
const Card = mongoose.model<Card>('Card');
const Board = mongoose.model<Board>('Board');
const Category = mongoose.model<Category>('Category');

// POST new board
router.post('/', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, body } = req;

  try {
    // Verify JWT with database to prevent auth on old session
    const existingUser = await User.findById(user._id);
    if (existingUser === null) {
      throw new Error('user not found');
    }

    const board = new Board({
      title: body.title,
      categories: [],
      members: [ { id: user._id, scopes: ['admin']} ],
      createdOn: new Date().getTime(),
      updatedOn: new Date().getTime(),
      archived: false,
    });

    await board.save();
    return res.status(200).send(board);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// GET all boards
router.get('/', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user } = req;

  try {
    const boards = await Board.find({
      members: {
        $elemMatch: {
          id: user._id,
        },
      },
      archived: false,
    });

    return res.status(200).send(boards);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// GET board
router.get('/:boardid', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, params } = req;

  try {
    const board = await Board.findOne({
      _id: params.boardid,
      members: {
        $elemMatch: {
          id: user._id,
        },
      },
      archived: false,
    });

    if (board === null) {
      throw new Error('board not found');
    }

    const categories = await Category.find({
      _id: { $in: board.categories },
    });

    const cards = await Card.find({
      _id: { $in: categories.reduce<string[]>((a, b) => a.concat(...b.cards), []) },
    });

    // We should not have to sort these. Order will be dirived from the arrays on board/category objects
    // categories.sort((a, b) => board.categories.indexOf(a._id) - board.categories.indexOf(b._id));
    // cards.sort((a, b) => board.cards.indexOf(a._id) - board.cards.indexOf(b._id));

    return res.status(200).send({
      board,
      cards,
      categories,
    });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// POST update board
router.post('/:boardid', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, body, params } = req;

  try {
    const board = await Board.findOneAndUpdate({
      _id: params.boardid,
      members: {
        $elemMatch: {
          id: user._id, scopes: 'admin',
        },
      },
      archived: false,
    }, {
      ...body,
      updatedOn: new Date(),
    }, { new: true });

    if (board === null) {
      throw new Error('board not found');
    }

    return res.status(200).send(board.toJSON());
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// DELETE board
router.delete('/:boardid', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, params } = req;

  try {
    const board = await Board.findOne({
      _id: params.boardid,
      members: {
        $elemMatch: {
          id: user._id, scopes: 'admin',
        },
      },
    });

    if (board === null) {
      throw new Error('board not found');
    }

    Object.assign(board, {
      archived: !board.archived,
    });

    await board.save();
    return res.status(200).send(board);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

export default router;