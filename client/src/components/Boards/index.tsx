import React, { useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { fetchBoards } from '../../store/boards/actions';

import './Boards.scss';
import '../Categories/Categories.scss';
import '../Cards/Cards.scss';
import BoardList from './BoardList';
import BoardView from './BoardView';
import BoardNew from './BoardNew';
import BoardSettings from './BoardSettings';

function Boards() {
  const dispatch = useDispatch();

  useEffect(() => {
    const getBoards = () => {
      dispatch(fetchBoards());
    };

    getBoards();
  }, [dispatch]);

  return (
    <div className="Boards">
      <Route path="/boards/:boardid/settings" component={BoardSettings} />
      <Switch>
        <Route exact path="/boards" component={BoardList} />
        <Route exact path="/boards/new" component={BoardNew} />
        <Route path="/boards/:boardid" component={BoardView} />
      </Switch>
    </div>
  );
}

export default Boards;
