import React, { useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../../store';
import { deleteBoard, updateBoard, updateBoardForm } from '../../store/boards/actions';
import Nav from 'react-bootstrap/Nav';

function BoardSettings() {
  const params: { boardid: string } = useParams();
  const history = useHistory();

  const [selectedPage, setSelectedPage] = useState(0);

  const boards = useSelector((state: RootState) => state.boards);
  const board = boards.byId[params.boardid];

  const dispatch = useDispatch();

  const handleDelete = function(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (board) {
      dispatch(deleteBoard(board._id));

      history.push('/boards');
    }
  };

  const handleChange = function(event: React.ChangeEvent<HTMLInputElement>) {
    if (typeof board === 'undefined') {
      return;
    }

    const boardForm = boards.form[board._id];
    if (typeof boardForm === 'undefined') {
      return;
    }

    dispatch(updateBoardForm({
      ...boardForm,
      [event.target.name]: event.target.value,
    }));
  };

  const boardSettingsPages = [
    {
      title: 'General',
      options: [
        // {
        //   type: 'text',
        //   section: 'Board',
        //   label: 'Board Name',
        //   onChange: handleChange,
        // },
        {
          type: 'button',
          section: 'danger',
          variant: 'danger',
          label: 'Delete board',
          text: 'This cannot be undone.',
          onClick: handleDelete,
        },
      ],
    },
    // {
    //   title: 'Sharing',
    //   options: [],
    // },
  ];

  function renderInput(option: any) {
    switch (option.type) {
      case 'text':
        return (
          <div className="form-group">
            <label>{option.label}</label>
            <input
              className="form-control"
              type={option.type}
              onChange={option.onChange}
            />
            <small className="form-text text-muted">{option?.text}</small>
          </div>
        );
      case 'button':
        return (
          <>
            <button
              className={`btn btn-${option.variant}`}
              onClick={option.onClick}
            >
              {option.label}
            </button>
            <small className={`form-text text-${option.variant}`}>{option?.text}</small>
          </>
        );
      default:
        break;
    }
  }

  return (
    <div className="BoardSettings modal fade show" role="dialog" style={{ display: 'block' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="exampleModalLabel">Board Settings</h5>
            <Link to={`/boards/${params.boardid}`} className="close" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </Link>
          </div>
          <div className="modal-body">
            <div className="container">
              <form className="row">
                <div className="col-3">
                  <nav className="nav nav-pills flex-column">
                    {boardSettingsPages.map((settingsPage, index) => (
                      <Nav.Link
                        key={`settingsPage-${settingsPage.title}`}
                        className="nav-link mb-1"
                        active={selectedPage === index}
                        onClick={(): void => setSelectedPage(index)}
                      >
                        {settingsPage.title}
                      </Nav.Link>
                    ))}
                  </nav>
                </div>
                <div className="col-9">
                  <div className="tab-content">
                    <div className="tab-pane fade show active">
                      {boardSettingsPages[selectedPage].options.map((option) => (
                        renderInput(option)
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-footer">
            <Link to={`/boards/${params.boardid}`} className="btn btn-secondary">Close</Link>
            <button className="btn btn-primary">Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoardSettings;