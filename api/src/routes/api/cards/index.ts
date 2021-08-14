import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import auth from '../../../auth';
import Card, { CardUpdateProperties } from '../../../models/Card';
import LocalUser from '../../../models/LocalUser';
import Board from '../../../models/Board';
import Category from '../../../models/Category';

const router = express.Router();

const User = mongoose.model<LocalUser>('LocalUser');
const Card = mongoose.model<Card>('Card');
const Board = mongoose.model<Board>('Board');
const Category = mongoose.model<Category>('Category');

// POST new card
router.post('/', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, body } = req;

  try {
    // Verify JWT with database to prevent auth on old session
    const existingUser = await User.findById(user._id);
    if (existingUser === null) {
      throw new Error('user not found');
    }

    const board = await Board.findOne({
      _id: body.boardid,
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

    const category = await Category.findOne({
      _id: body.categoryid,
      archived: false,
    });

    if (category === null) {
      throw new Error('category not found');
    }

    const card = new Card({
      title: body.title,
      description: body.description,
      createdOn: new Date().getTime(),
      updatedOn: new Date().getTime(),
      categoryid: body.categoryid,
      boardid: body.boardid,
      archived: false,
    });

    category.cards.push(card._id);

    await category.save();
    await card.save();

    return res.status(200).send({
      card: card.toJSON(),
      category: category.toJSON(),
    });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// GET card
router.get('/:cardid', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, params } = req;

  try {
    const card = await Card.findOne({
      _id: params.cardid,
      archived: false,
    });

    if (card === null) {
      throw new Error('card not found');
    }

    const board = await Board.findOne({
      _id: card.boardid,
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

    return res.status(200).send(card);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// POST update card
router.post('/:cardid', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, body, params } = req;

  try {
    const card = await Card.findOne({
      _id: params.cardid,
      archived: false,
    });

    if (card === null) {
      throw new Error('card not found');
    }

    const board = await Board.findOne({
      _id: card.boardid,
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

    Object.assign<Card, Pick<Card, CardUpdateProperties>>(card, {
      title: body.title,
      description: body.description,
      categoryid: body.categoryid,
      updatedOn: new Date(),
    });

    await card.save();
    return res.status(200).send(card);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// DELETE card
router.delete('/:cardid', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, params } = req;

  try {

    const card = await Card.findOne({
      _id: params.cardid,
      archived: false,
    });

    if (card === null) {
      throw new Error('card not found');
    }

    const board = await Board.findOne({
      _id: card.boardid,
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

    Object.assign(card, {
      archived: true,
    });

    const category = await Category.findByIdAndUpdate(card.categoryid, {
      $pull: {
        cards: card._id,
      },
    }, { new: true });

    if (!category) {
      throw new Error('unable to update category');
    }

    await card.save();
    return res.status(200).send({
      card: card.toJSON(),
      category: category.toJSON(),
    });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

export default router;