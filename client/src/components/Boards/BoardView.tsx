import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { Link, useParams } from 'react-router-dom';

import update from 'immutability-helper';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Navbar from 'react-bootstrap/Navbar';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { fetchBoard, updateBoard, updateBoardForm } from '../../store/boards/actions';

import { BoardForm } from '../../store/boards/types';
import { updateCard } from '../../store/cards/actions';
import { updateCategory, updateCategoryForm } from '../../store/categories/actions';
import CategoryList from '../Categories/CategoryList';

function BoardView() {
  const params: { boardid: string } = useParams();

  const [formOpen, setFormOpen] = useState(false);

  const boards = useSelector((state: RootState) => state.boards);
  const cards = useSelector((state: RootState) => state.cards);
  const categories = useSelector((state: RootState) => state.categories);

  const board = boards.byId[params.boardid];

  const dispatch = useDispatch();

  useEffect(() => {
    const getBoard = function() {
      dispatch(fetchBoard(params.boardid));
    };

    getBoard();
  }, [dispatch, params.boardid]);


  const onDragEnd = (res: DropResult) => {
    if (!board || !res.destination) {
      return;
    }

    if (res.type === 'category') {
      const originIndex = board.categories.indexOf(res.draggableId);
      const destinationIndex = res.destination.index;

      const boardForm: BoardForm = {
        ...board,
        categories: update(board.categories, {
          $splice: [
            [originIndex, 1],
            [destinationIndex, 0, res.draggableId],
          ],
        }),
      };

      dispatch(updateBoardForm(boardForm));
      dispatch(updateBoard(boardForm));
    }

    if (res.type === 'card') {
      const card = cards.byId[res.draggableId];
      let sourceCategory = categories.byId[res.source.droppableId];
      let destinationCategory = categories.byId[res.destination.droppableId];

      if (!card || !sourceCategory || !destinationCategory) {
        return;
      }

      if (sourceCategory === destinationCategory) { // Same source and destination category
        sourceCategory = {
          ...sourceCategory,
          cards: update(sourceCategory.cards, {
            $splice: [
              [res.source.index, 1],
              [res.destination.index, 0, res.draggableId],
            ],
          }),
        };

        dispatch(updateCategoryForm(sourceCategory));
        dispatch(updateCategory(sourceCategory));
      } else {
        sourceCategory = {
          ...sourceCategory,
          cards: update(sourceCategory.cards, {
            $splice: [
              [res.source.index, 1],
            ],
          }),
        };

        destinationCategory = {
          ...destinationCategory,
          cards: update(destinationCategory.cards, {
            $splice: [
              [res.destination.index, 0, res.draggableId],
            ],
          }),
        };

        dispatch(updateCategoryForm(sourceCategory));
        dispatch(updateCategoryForm(destinationCategory));
        dispatch(updateCategory(sourceCategory));
        dispatch(updateCategory(destinationCategory));
      }

      dispatch(updateCard({
        ...card,
        categoryid: res.destination.droppableId,
      }));
    }
  };

  const handleChange = function(event: React.ChangeEvent<HTMLInputElement>): void {
    if (typeof board === 'undefined') {
      return;
    }

    const boardForm = boards.form[board.id];
    if (typeof boardForm === 'undefined') {
      return;
    }

    dispatch(updateBoardForm({
      ...boardForm,
      [event.target.name]: event.target.value,
    }));
  };

  const handleBlur = function(event: React.FocusEvent<HTMLInputElement>) {
    submitForm();
  };

  const handleSubmit = function(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitForm();
  };

  const submitForm = function() {
    if (typeof board === 'undefined') {
      return;
    }

    const boardForm = boards.form[board.id];
    if (typeof boardForm === 'undefined') {
      return;
    }

    dispatch(updateBoard(boardForm));

    setFormOpen(false);
  };

  if (typeof board === 'undefined') {
    return null;
  }

  if (typeof boards.form[board.id] === 'undefined') {
    return null;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="BoardView">
        <Navbar variant="dark">
          {formOpen ? (
            <Form onSubmit={handleSubmit} className="BoardView-titleForm">
              <Form.Control
                autoFocus
                name="title"
                size="lg"
                value={boards.form[board.id]!.title}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </Form>
          ) : (
            <Button
              className="BoardView-titleForm"
              variant="outline-dark"
              size="lg"
              style={{ color: 'white', fontWeight: 700 }}
              onClick={() => setFormOpen(true)}
            >
              <span>{boards.form[board.id]!.title}</span>
            </Button>
          )}
          <Link to={`/boards/${board.id}/settings`} className="BoardEdit-btn btn btn-lg">
            <i className="fal fa-cog"></i>
          </Link>
        </Navbar>
        <Droppable droppableId={params.boardid} direction="horizontal" type="category">
          {(provided) => (
            <CategoryList boardid={params.boardid} {...provided.droppableProps} placeholder={provided.placeholder} innerRef={provided.innerRef} />
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}

export default BoardView;