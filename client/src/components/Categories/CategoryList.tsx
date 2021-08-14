import React from 'react';

import { useSelector } from 'react-redux';
import { RootState } from '../../store';

import CategoryView from './CategoryView';
import CategoryNew from './CategoryNew';

const CategoryList: React.FC<CategoryListProps> = function({ boardid, placeholder, innerRef}) {
  const boardForm = useSelector((state: RootState) => state.boards.form[boardid]);

  if (typeof boardForm === 'undefined') {
    return null;
  }

  return (
    <div className="CategoryList" ref={innerRef}>
      {boardForm.categories.map((id, index) => {
        return (
          <CategoryView key={id} categoryid={id} index={index} />
        );
      })}
      {placeholder}
      <CategoryNew />
    </div>
  );
};

export interface CategoryListProps {
  boardid: string;
  placeholder: any;
  innerRef: any;
}

export default CategoryList;
