import React from 'react';
import { Link } from 'react-router-dom';

import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logoutUser } from '../../store/auth/actions';

import './Header.scss';

function Header() {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  const logout = (e: React.MouseEvent) => {
    e.preventDefault();
    document.cookie = 'token=;';
    dispatch(logoutUser());
  };

  return (
    <header className="Header">
      <Navbar className="Header-navbar" bg="dark" variant="dark" expand="lg">
        <Link to="/">
          <Navbar.Brand className="Brand">Billboard</Navbar.Brand>
        </Link>
        <Navbar.Toggle aria-controls="navbar-nav" />
        <Navbar.Collapse id="navbar-nav">
          {auth.fetched ? (
            <Nav className="mr-auto">
              <Link to="/boards" className="nav-link">
              Boards
              </Link>
            </Nav>
          ) : (
            null
          )}
          {auth.fetched ? (
            <Nav className="ml-auto">
              <Link to="/logout" className="nav-link" onClick={logout}>
                Log Out
              </Link>
            </Nav>
          ) : (
            <Nav className="ml-auto">
              <Link to="/login" className="nav-link">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Create an Account
              </Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Navbar>
    </header>
  );
}

export default Header;
