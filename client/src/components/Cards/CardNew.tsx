import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

import { useDispatch } from 'react-redux';
import { createCard } from '../../store/cards/actions';

const CardNew: React.FC<CardNewProps> = function({ categoryid }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const { boardid } = useParams();

  const dispatch = useDispatch();

  const handleOpen = function(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    setOpen(true);
  };

  const handleClose = function(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    setTitle('');
    setOpen(false);
  };

  const handleChange = function(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTitle(e.target.value);
  };

  const handleKeyPress = function(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitForm();
    }
  };

  const submitForm = function() {
    const cardForm = {
      _id: '*',
      title,
      boardid,
      categoryid,
    };

    dispatch(createCard(cardForm));
    setOpen(true); // Keep the form open for successive creation
    setTitle('');
  };

  const handleSubmit = function(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitForm();
  };

  return (
    <div className="CardNew">
      <Card bg={open ? 'light' : undefined }>
        {open ? (
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group>
                <Form.Control
                  autoFocus
                  as="textarea"
                  rows={3}
                  size="sm"
                  style={{ resize: 'none' }}
                  placeholder="Enter card title..."
                  name="title"
                  value={title}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                />
              </Form.Group>
              <Button
                type="submit"
                variant="success"
                children="Save"
                size="sm"
              />
              <button
                type="button"
                className="btn btn-sm"
                children={<i className="fa far fa-times" />}
                onClick={handleClose}
              />
            </Form>
          </Card.Body>
        ) : (
          <button
            className="CardNew-btn btn text-left"
            onClick={handleOpen}>
            <i className="fa far fa-plus" />&nbsp;<span>Add a card</span>
          </button>
        )}
      </Card>
    </div>
  );
};

export default CardNew;

export interface CardNewProps {
  categoryid: string;
}