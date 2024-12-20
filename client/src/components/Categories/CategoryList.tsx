import React from 'react';

import { useSelector } from 'react-redux';
import { RootState } from '../../store';

import CategoryNew from './CategoryNew';
import CategoryView from './CategoryView';

const CategoryList: React.FC<CategoryListProps> = function({ boardid, placeholder, innerRef}) {
  const boardForm = useSelector((state: RootState) => state.boards.form[boardid]);

  if (typeof boardForm === 'undefined') {
    return null;
  }

  return (
    <div className="CategoryList" ref={innerRef}>
      {boardForm.categories.map((c, index) => {
        return (
          <CategoryView key={c.id} categoryid={c.id} index={index} />
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
