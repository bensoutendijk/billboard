import React from 'react';

import CardView from './CardView';

export interface CardListProps {
  cards: string[];
  placeholder: any;
  innerRef: any;
}

const CardList: React.FC<CardListProps> = function({ cards, innerRef, placeholder }) {
  return (
    <div className="CardList" ref={innerRef}>
      {cards.map((id, index) => <CardView key={id} cardid={id} index={index} />)}
      {placeholder}
    </div>
  );
};

export default CardList;
