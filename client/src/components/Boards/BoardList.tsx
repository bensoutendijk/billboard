import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { RootState } from '../../store';

import './Boards.scss';

function BoardList() {
  const boards = useSelector((state: RootState) => state.boards);

  return (
    <div className="BoardList container pt-4">
      <h2>My Boards</h2>
      {boards.allIds.map((id) => {
        const board = boards.byId[id];
        if (typeof board === 'undefined') {
          return null;
        }

        return (
          <Link key={board._id} to={`/boards/${board._id}`} className="BoardList-button btn btn-dark">
            <h6>{board.title}</h6>
          </Link>
        );
      })}
      <Link
        to="/boards/new"
        className="BoardList-button BoardList-button-new btn btn-secondary"
        children="Create New Board"
      />
    </div>
  );
}

export default BoardList;
