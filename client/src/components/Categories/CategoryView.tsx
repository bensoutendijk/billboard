import clsx from 'clsx';
import React, { useState } from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import Card from 'react-bootstrap/Card';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { deleteCategory } from '../../store/categories/actions';

import CardList from '../Cards/CardList';
import CardNew from '../Cards/CardNew';

const CategoryView: React.FC<CategoryViewProps> = function({ categoryid, index }) {
  const [state, setState] = useState<CategoryViewState>({});
  const categories = useSelector((state: RootState) => state.categories);
  const category = categories.byId[categoryid];
  const categoryForm = categories.form[categoryid];

  const dispatch = useDispatch();

  // Event Handlers
  const handleToggleDropdown = function() {
    setState({
      ...state,
      dropdown: !state.dropdown,
    });
  };

  const handleDeleteCategory = function() {
    if (!category) {
      return;
    }

    setState({
      ...state,
      dropdown: false,
    });

    dispatch(deleteCategory(category.id));
  };

  if (!categoryForm) {
    return null;
  }

  return (
    <Draggable draggableId={categoryid} index={index}>
      {(provided) => (
        <div className="CategoryView" {...provided.draggableProps} ref={provided.innerRef}>
          <Card
            bg="light"
            className="CategoryView-card"
          >
            <div className="CategoryHeader"  {...provided.dragHandleProps}>
              <span className="CategoryTitle">
                {category?.title}
              </span>
              <div className="dropdown">
                <button id={`delete-category-${categoryid}`} className="btn" onClick={handleToggleDropdown}>
                  <i className="far fa-ellipsis-h"></i>
                </button>
                <div className={clsx('dropdown-menu', { show: state.dropdown })}>
                  <button className="dropdown-item" onClick={handleDeleteCategory}>Delete</button>
                </div>
              </div>
            </div>
            <Card.Body>
              <Droppable droppableId={categoryid} type="card">
                {(provided) => (
                  <CardList cards={categoryForm.cards} innerRef={provided.innerRef} placeholder={provided.placeholder} {...provided.droppableProps} />
                )}
              </Droppable>
              <CardNew categoryid={categoryid} />
            </Card.Body>
          </Card>
        </div>
      )}
    </Draggable>
  );
};

export default CategoryView;

export interface CategoryViewProps {
  categoryid: string;
  index: number;
}

export interface CategoryViewState {
  dropdown?: boolean;
}