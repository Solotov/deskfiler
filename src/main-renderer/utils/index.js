import {
  remote,
} from 'electron';

import csv from 'fast-csv';

import store from 'store';

import {
  DateTime,
} from 'luxon';

const fs = remote.require('fs');
const path = remote.require('path');

const baseUrl = (
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8080'
    : `file://${path.join(__dirname, '..', '..', 'dist')}`
);

const { BrowserWindow } = remote;

const { dialog } = remote;

const pluginsWithAuth = ['g-vision'];

export const getPluginPath = key => path.join(process.cwd(), 'installed-plugins', key);

export const checkPluginAuth = key => pluginsWithAuth.find(plugin => plugin === key);

export const modalWindows = {
  inputModal: null,
};

export const createModalWindow = async ({
  params,
  key,
}) => {
  if (!modalWindows[key]) {
    modalWindows[key] = new BrowserWindow({
      ...params,
      modal: true,
      parent: remote.getCurrentWindow(),
      useContentSize: true,
      center: true,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        devTools: process.env.NODE_ENV === 'development' || false,
      },
    });

    await modalWindows[key].loadURL(`${baseUrl}/public/${key}.html`);

    if (process.env.NODE_ENV === 'development') {
      modalWindows[key].webContents.openDevTools();
    }

    modalWindows[key].on('closed', () => {
      modalWindows[key] = null;
    });
  }
};

export const createSaveDialog = (options = {}) => (
  dialog.showSaveDialog(
    remote.getCurrentWindow(),
    options,
  ));

export const createOpenDialog = ({ options = {}, properties = [] }) => (
  dialog.showOpenDialog(
    remote.getCurrentWindow(),
    {
      properties,
      ...options,
    },
  )
);

export const getLogs = (pluginKey) => {
  const dirPath = path.join(process.cwd(), 'logs');
  const filePath = path.join(process.cwd(), 'logs', `${pluginKey}-logs.txt`);
  const isDirExists = fs.existsSync(dirPath);
  if (!isDirExists) {
    return null;
  }
  const isFileExists = fs.existsSync(filePath);
  if (!isFileExists) {
    return null;
  }
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const splittedLogs = fileContents.trim().split('\n');
  return splittedLogs;
};

export const exportLogs = async (data) => {
  const now = DateTime.local().toFormat('yyyy-MM-dd');
  const {
    canceled,
    filePath,
  } = await createSaveDialog({
    options: {
      defaultPath: `${now}-deskfiler-logs.csv`,
    },
    filters: [{
      name: 'Spreadsheet',
      extensions: ['csv'],
    }],
  });

  if (!canceled) {
    csv.writeToPath(filePath, data)
      .on('error', err => console.error(err))
      .on('finish', () => console.log('Done writing.'));
  }
};

export const updateStore = async ({ key, subKey, values }) => {
  const prevSettings = await store.get(key);
  store.set(key, {
    ...(prevSettings || {}),
    [subKey]: {
      ...(prevSettings && prevSettings[subKey] ? prevSettings[subKey] : {}),
      ...values,
    },
  });
};