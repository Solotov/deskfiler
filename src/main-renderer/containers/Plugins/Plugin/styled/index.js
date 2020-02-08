import styled, { css, keyframes } from 'styled-components';
import wave from 'assets/images/wave.png';
import microWave from 'assets/images/wave-min.png';
import store from 'store';

export const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #3adb76;
  z-index: -1;
  transform: ${({ percentage }) => (`scaleY(${(percentage ? (percentage / 100) : 0)})`)};
  transition: transform 1s, opacity 0.5s;
  transform-origin: 50% 100%;
  opacity: ${({ opacity }) => (opacity || '0')};
`;

export const AppCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: white;
  font-size: 20px;
  padding: 16px 0;
  height: 100%;
  transition: .5s ease;
  position: relative;
  overflow: hidden;
`;

export const AppFigureWrapper = styled.div`
  width: 50vw;
  height: 190px;
`;

export const AppFigure = styled.figure`
  border-radius: 50%;
  padding: 3px;
  display: flex;
  justify-content: center;
  flex: 0 0 auto;
  height: 100%;
  background-color: #fff;
`;

export const AppIcon = styled.img`
  width: ${({ showBar }) => (showBar ? '90%' : '50%')};
  object-fit: scale-down;
  padding: 2px;
  flex: 0 0 75%;
`;

export const AppOptions = styled.div`
  position: absolute;
  height: 20px;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100%;
  transition: opacity .2s ease;
  opacity: 0;
  transform-origin: 0% 100%;
`;

export const Remove = styled.a`
  display: flex;
  text-decoration: none;
  cursor: pointer;
  margin-top: 10px;
  transition: transform .2s ease-in;
  transform-origin: 0% 100%;
  &:hover {
    transform: scale(1.1) translateY(-5%);
  }
`;

export const RemoveIcon = styled.img`
  height: 35px;
`;

export const Settings = styled.a`
  display: flex;
  text-decoration: none;
  cursor: pointer;
  margin-top: 10px;
  transition: transform .2s ease-in;
  transform-origin: 0% 100%;
  &:hover {
    transform: scale(1.1) translateY(-5%);
  }
`;

export const SettingsIcon = styled.img`
  height: 35px;
`;

export const AppInfo = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
  position: relative;
  margin-top: 8px;
  flex: 1 1 auto;
  &:hover {
    & > ${AppOptions} {
      background: #fff;
      opacity: 1;
    }
  }
`;

export const Divider = styled.hr`
  margin: 8px 0;
  border-bottom: 1px solid black;
  width: 50%;
`;

export const AppTitle = styled.h2`
  margin-top: 5px;
  font-size: 20px;
  text-align: center;
  font-family: Roboto;
`;

export const DropFilesTitle = styled.span`
  display: none;
  pointer-events: none;
  position: absolute;
  font-size: ${({ showBar }) => (showBar ? '14px' : '20px')};
  color: rgba(255, 255, 255, 1);
  opacity: 0;
  transition: opacity .5s ease;
  font-weight: 900;
  justify-content: center;
  height: 100%;
  width: 100%;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  z-index: 3;
`;

export const CardOverlay = styled.div`

  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
  border-radius: ${props => (props.radius ? props.radius : '2px')};
  border: ${props => props.border || 'none'};
  box-shadow: 2px 2px 8px 2px rgba(0, 0, 0, .08);
  cursor: pointer;

  ${({ isDragActive, isFileRejected }) => ((isDragActive || isFileRejected) && css`
    ${AppCard} {
      opacity: 0.3;
    };
    ${AppIcon} {
      filter: blur(1);
    }
`)};

  ${({ isDragActive }) => (isDragActive && css`
    ${DropFilesTitle} {
      background: rgba(58, 219, 118, 1);
      opacity: 1;
      text-align:center;
    };
  `)}

  ${({ isFileRejected }) => (isFileRejected && css`
    ${DropFilesTitle} {
  text-align:center;
      background: red;
      opacity: 1;
    };
  `)}
`;

const waving = keyframes`
  0% {
    background-position-x: 0%;
  }
  30% {
    background-position-x: 100px;
  }
  60% {
    background-position-x: 200px;
  }
  100% {
    background-position-x: 300px;
  }
`;

export const InstallingOverlay = styled.div`
  position: absolute;
  transition: height 1s ease-in;
  height: ${props => (props.active ? '60%' : '0%')};
  bottom: 0;
  width: 100%;
  background: transparent;
  z-index: 1;
  background-size: auto;
  background-repeat-x: repeat;
  background-repeat-y: no-repeat;
  background-image:  url(${props => (props.showBar ? microWave : wave)});
  background-position-x: 0px;
  background-position-y: ${props => (props.showBar ? '9px' : '0px')};
  animation: ${waving} ${props => (props.showBar ? '1.5s' : '1s')} infinite linear;
  &:after {
    font-family: Roboto;
    font-weight: 500;
    font-size: 20px;
    color: white;
    line-height: 10em;
    text-align: center;
    content: 'Installing...';
    position: absolute;
    top: 44px;
    bottom: 0;
    width: 100%;
    background: #0069FF;
  }
`;
