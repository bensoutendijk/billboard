import React from 'react';

const ViewSourceButton: React.FC = () => {
  return (
    <div className="ViewSourceButton">
      <a href="https://github.com/bensoutendijk/billboard" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
        <span>View Source</span>
      </a>
    </div>
  );
};

export default ViewSourceButton;