import React, { useState, useEffect, useRef } from 'react';
import { Draggable } from 'react-beautiful-dnd';

import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateCardForm, updateCard, deleteCard } from '../../store/cards/actions';

const CardView: React.FC<CategoryViewProps> = function({ cardid, index }) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cards = useSelector((state: RootState) => state.cards);
  const card = cards.byId[cardid];
  const cardForm = cards.form[cardid];

  const dispatch = useDispatch();

  const submitForm = function() {
    const cardForm = cards.form[cardid];
    if (typeof cardForm === 'undefined') {
      return;
    }

    dispatch(updateCard(cardForm));
    setOpen(false);
  };

  const handleSubmit = function(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitForm();
  };

  const handleChange = function(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const cardForm = cards.form[cardid];
    if (typeof cardForm === 'undefined') {
      return;
    }

    dispatch(updateCardForm({ ...cardForm, [e.target.name]: e.target.value }));
  };

  const handleKeyPress = function(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      submitForm();
    }
  };

  const handleOpen = function() {
    if (typeof card === 'undefined') {
      return;
    }

    dispatch(updateCardForm(card));
    setOpen(true);
  };

  const handleDelete = function(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    dispatch(deleteCard(cardid));
    setOpen(false);
  };

  useEffect(() => {
    const clickHandler = function(e: MouseEvent) {
      if (e.target === cardRef.current) {
        setOpen(false);
      }
    };

    const keypressHandler = function(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('click', clickHandler);
      document.addEventListener('keydown', keypressHandler);

      if (inputRef.current !== null) {
        inputRef.current.select();
      }
      return () => {
        document.removeEventListener('click', clickHandler);
        document.removeEventListener('keydown', keypressHandler);
      };
    }
  },[open]);

  return (
    <Draggable draggableId={cardid} index={index}>
      {(provided) => (
        <div className="CardView" {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
          {open ? (
            <Card className="CardEdit-card" ref={cardRef}>
              <Form className="CardEdit-card-form" onSubmit={handleSubmit}>
                <Card.Body>
                  <Form.Control
                    ref={inputRef}
                    autoFocus
                    as="textarea"
                    rows={4}
                    style={{ resize: 'none' }}
                    name="title"
                    value={cardForm?.title}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                  />
                </Card.Body>
                <div className="mt-2">
                  <button
                    type="submit"
                    className="btn btn-success"
                    children="Save"
                  />
                </div>
              </Form>
              <div className="CardEdit-card-quicktools">
                <button
                  className="btn btn-dark"
                  children="Edit labels"
                />
                <button
                  className="btn btn-dark"
                  children="Copy"
                />
                <button
                  className="btn btn-dark"
                  children="Archive"
                  onClick={handleDelete}
                />
              </div>
            </Card>
          ) : (
            null
          )}
          <Card className="CardView-card" bg="light">
            <Card.Body>
              <span>
                {card?.title}
              </span>
              <button
                type="button"
                className="CardEdit-btn btn btn-sm"
                onClick={handleOpen}
                children={<i className="fa fal fa-pencil fa-sm" />}
              />
            </Card.Body>
          </Card>
        </div>
      )}
    </Draggable>
  );
};

export default CardView;

export interface CategoryViewProps {
  cardid: string;
  index: number;
}