import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

import { useDispatch, useSelector } from 'react-redux';
import { createCategory } from '../../store/categories/actions';
import { RootState } from '../../store';

function CategoryNew() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const { boardid } = useParams();
  const board = useSelector((state: RootState) => state.boards.byId[boardid]);
  const dispatch = useDispatch();

  if (typeof board === 'undefined') {
    return null;
  }

  const categoryForm = {
    title,
    cards: [],
    boardid,
    index: board.categories.length,
  };

  const handleSubmit = function(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    dispatch(createCategory(categoryForm));
    setOpen(true); // Keep the form open for successive creation
    setTitle('');
  };

  return (
    <div className="CategoryNew">
      <Card bg={open ? 'light' : undefined }>
        {open ? (
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group>
                <Form.Control
                  autoFocus
                  type="text"
                  placeholder="Enter category name..."
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Form.Group>
              <Button
                type="submit"
                variant="success"
                children="Save Category"
                size="sm"
              />
              <button
                type="button"
                className="btn btn-sm"
                children={<i className="fa far fa-times" />}
                onClick={() => setOpen(false)}
              />
            </Form>
          </Card.Body>
        ) : (
          <button
            className="CategoryNew-btn btn"
            onClick={() => setOpen(true)}>
            <i className="fa far fa-plus" />&nbsp;<span>Add new category</span>
          </button>
        )}
      </Card>
    </div>
  );
}

export default CategoryNew;
