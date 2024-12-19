import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

import { useDispatch } from 'react-redux';

import { createBoard } from '../../store/boards/actions';
import BoardList from './BoardList';

function BoardNew() {
  const [title, setTitle] = useState('');
  const history = useHistory();

  const dispatch = useDispatch();

  function handleClose() {
    history.goBack();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const boardForm = {
      id: '*',
      title,
      categories: [],
      cards: [],
    };

    dispatch(createBoard(boardForm));

    handleClose();
  }
  return (
    <>
      <BoardList />
      <Modal show onHide={handleClose} animation={false}>
        <Modal.Body>
          <div className="row">
            <div className="col-10">
              <Form onSubmit={handleSubmit}>
                <Form.Group>
                  <Form.Control
                    autoFocus
                    type="text"
                    placeholder="Choose a board title..."
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Form.Group>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleClose}
                  children="Cancel"
                  className="mr-2"
                />
                <Button
                  variant="primary"
                  type="submit"
                  children="Create board"
                />
              </Form>
            </div>
            <div className="col">
              <Button variant="light" type="button" onClick={handleClose}>&times;</Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default BoardNew;