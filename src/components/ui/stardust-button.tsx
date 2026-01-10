import React from 'react';
import { cn } from '@/lib/utils';

interface StardustButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
}

export const StardustButton: React.FC<StardustButtonProps> = ({ 
  children = "Launching Soon", 
  onClick, 
  className = "",
  disabled,
  ...props 
}) => {
  const buttonStyle: React.CSSProperties = {
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 0,
    position: 'relative',
    borderRadius: '100px',
    backgroundColor: 'hsl(var(--primary))',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    boxShadow: `
      inset 0 0.3rem 0.9rem rgba(255, 255, 255, 0.3),
      inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.7),
      inset 0 -0.4rem 0.9rem rgba(255, 255, 255, 0.5),
      0 3rem 3rem rgba(0, 0, 0, 0.3),
      0 1rem 1rem -0.6rem rgba(0, 0, 0, 0.8)
    `,
  };

  const wrapStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: 'hsl(var(--primary-foreground))',
    padding: '20px 32px',
    borderRadius: 'inherit',
    position: 'relative',
    overflow: 'hidden',
  };

  const pStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: 0,
    transition: 'all 0.2s ease',
    transform: 'translateY(2%)',
    maskImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 1) 40%, transparent)',
    WebkitMaskImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 1) 40%, transparent)',
  };

  const beforeAfterStyles = `
    .pearl-button .wrap::before,
    .pearl-button .wrap::after {
      content: "";
      position: absolute;
      transition: all 0.3s ease;
    }
    
    .pearl-button .wrap::before {
      left: -15%;
      right: -15%;
      bottom: 25%;
      top: -100%;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.15);
    }
    
    .pearl-button .wrap::after {
      left: 6%;
      right: 6%;
      top: 12%;
      bottom: 40%;
      border-radius: 22px 22px 0 0;
      box-shadow: inset 0 10px 8px -10px rgba(255, 255, 255, 0.6);
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.25) 0%,
        rgba(0, 0, 0, 0) 50%,
        rgba(0, 0, 0, 0) 100%
      );
    }
    
    .pearl-button .wrap p span:nth-child(2) {
      display: none;
    }
    
    .pearl-button:not(:disabled):hover .wrap p span:nth-child(1) {
      display: none;
    }
    
    .pearl-button:not(:disabled):hover .wrap p span:nth-child(2) {
      display: inline-block;
    }
    
    .pearl-button:not(:disabled):hover {
      box-shadow:
        inset 0 0.3rem 0.5rem rgba(255, 255, 255, 0.4),
        inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.7),
        inset 0 -0.4rem 0.9rem rgba(255, 255, 255, 0.6),
        0 3rem 3rem rgba(0, 0, 0, 0.3),
        0 1rem 1rem -0.6rem rgba(0, 0, 0, 0.8);
    }
    
    .pearl-button:not(:disabled):hover .wrap::before {
      transform: translateY(-5%);
    }
    
    .pearl-button:not(:disabled):hover .wrap::after {
      opacity: 0.4;
      transform: translateY(5%);
    }
    
    .pearl-button:not(:disabled):hover .wrap p {
      transform: translateY(-4%);
    }
    
    .pearl-button:not(:disabled):active {
      transform: translateY(4px);
      box-shadow:
        inset 0 0.3rem 0.5rem rgba(255, 255, 255, 0.5),
        inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.8),
        inset 0 -0.4rem 0.9rem rgba(255, 255, 255, 0.4),
        0 3rem 3rem rgba(0, 0, 0, 0.3),
        0 1rem 1rem -0.6rem rgba(0, 0, 0, 0.8);
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: beforeAfterStyles }} />
      <button
        className={cn("pearl-button", className)}
        style={buttonStyle}
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        <div className="wrap" style={wrapStyle}>
          <p style={pStyle}>
            <span>✧</span>
            <span>✦</span>
            {children}
          </p>
        </div>
      </button>
    </>
  );
};

export default StardustButton;
