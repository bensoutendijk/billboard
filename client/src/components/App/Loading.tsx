import React from 'react';

function Loading() {
  return (
    <div className="AppLoading">
      <i className="fas fa-spinner fa-9x fa-pulse"></i>
      <h4 className="AppLoading-text">Please wait while our servers wake up...</h4>
    </div>
  );
}

export default Loading;