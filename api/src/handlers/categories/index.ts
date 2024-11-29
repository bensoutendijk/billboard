import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import auth from '../../../auth';
import Card from '../../../models/Card';
import LocalUser from '../../../models/LocalUser';
import Board from '../../../models/Board';
import Category from '../../../models/Category';

const router = express.Router();

const User = mongoose.model<LocalUser>('LocalUser');
const Card = mongoose.model<Card>('Card');
const Board = mongoose.model<Board>('Board');
const Category = mongoose.model<Category>('Category');

// POST new category
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

    const category = new Category({
      ...body,
      createdOn: new Date().getTime(),
      updatedOn: new Date().getTime(),
      archived: false,
    });

    await category.save();
    board.categories.push(category._id);
    await board.save();

    return res.status(200).send({
      board,
      category,
    });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// POST update category
router.post('/:categoryid', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, body, params } = req;

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

  try {
    const category = await Category.findOneAndUpdate({
      _id: params.categoryid,
      archived: false,
    }, {
      ...body,
      updatedOn: new Date(),
    }, { new: true });

    return res.status(200).send(category);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// DELETE category
router.delete('/:categoryid', ...auth.required, async (req: Request, res: Response): Promise<Response> => {
  const { user, params } = req;

  try {
    /*
    // Fetch the required data
    */

    const category = await Category.findOne({
      _id: params.categoryid,
      archived: false,
    });

    if (category === null) {
      throw new Error('category not found');
    }

    let board = await Board.findOne({
      _id: category.boardid,
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

    /*
    // Modify and save the data to update the database
    */

    Object.assign(category, {
      archived: true,
    });

    board = await Board.findByIdAndUpdate(category.boardid, {
      $pull: {
        categories: category._id,
      },
    }, { new: true });

    await Card.updateMany({
      _id: { $in: category.cards },
    }, { archived: true });

    await category.save();
    return res.status(200).send({ category, board });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

export default router;