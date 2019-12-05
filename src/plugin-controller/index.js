/*
 * DESKFILER PLUGIN CONTROLLER
 * Author: Ilya Lopukhin
 *
 * A plugin controller interface to provide system APIs together with context
 * layer of communication between plugin and main window
 *
 */
import { remote, shell, ipcRenderer } from 'electron';
import store from 'store';
import { updateSettingsStore, addStyles } from 'utils';
import { fontsCss } from 'styled';

import { LOGS_DIR, PORT, PLUGINS_DIR } from '../main-renderer/constants';

const fs = remote.require('fs');
const path = remote.require('path');

const hummus = remote.require('../node_modules/hummus/hummus.js');

const currentWindow = remote.getCurrentWindow();

const apiCall = async (url, params) => {
  try {
    const response = await fetch(url, {
      ...params,
      headers: {
        credentials: 'include',
        Authorization: `Basic ${btoa('a:b')}`,
        ...params.header,
      },
    });

    const json = await response.json();
    if (json.error) throw new Error(json.error);
    return json;
  } catch (err) {
    throw err;
  }
};

const getPluginInfo = async ({ pluginKey, token }) => {
  const url = 'https://plugins.deskfiler.org/api/index.php';

  const formData = {
    appaction: 'pluginfo',
    appid: pluginKey.split('-').join(''),
    appname: 'deskfiler',
    token,
  };

  try {
    const body = new FormData();

    Object.keys(formData).forEach((key) => {
      body.append(key, formData[key]);
    });

    const { data, success } = await apiCall(url, { method: 'POST', body });

    return {
      isRegistered: success && data.userplugin,
      ticket: data,
    };
  } catch (err) {
    return {
      isRegistered: false,
    };
  }
};

function injectPlugin({
  pluginKey,
  inDevelopment,
  devPluginUrl,
  allowedExtensions,
  filePaths,
  pluginAPIs,
  mainId,
  selfId,
  ticket,
}) {
  const newScriptSrc = inDevelopment
    ? `${devPluginUrl}/index.js?version=${Date.now().toString()}`
    : `http://localhost:${PORT}/${pluginKey}/index.js?version=${Date.now().toString()}`;

  const oldScriptNode = document.querySelector('#plugin');

  if (oldScriptNode) {
    oldScriptNode.parentNode.removeChild(oldScriptNode);
  }

  const scriptNode = document.createElement('script');

  scriptNode.setAttribute('type', 'text/javascript');
  scriptNode.setAttribute('src', newScriptSrc);
  scriptNode.setAttribute('id', 'plugin');

  scriptNode.onload = async () => {
    if (filePaths) {
      window.PLUGIN.handleFiles({
        inputs: {
          filePaths,
        },
        ticket,
        ...pluginAPIs,
      });
    } else if (window.PLUGIN.handleOpen) {
      window.PLUGIN.handleOpen({ ...pluginAPIs, ticket });
    } else if (window.PLUGIN.handleFiles) {
      console.log('Got plugin open request, but PLUGIN.handleOpen is not defined, opening file dialog');
      ipcRenderer.sendTo(mainId, 'open-dialog', {
        fromId: selfId,
        options: {
          title: 'Select files',
          filters: allowedExtensions ? [{ name: 'Files', extensions: allowedExtensions }] : [{ name: 'All files', extensions: ['*'] }],
        },
        properties: ['openFile', 'multiSelections'],
      });

      ipcRenderer.once('open-dialog-response', async (
        ev,
        {
          canceled,
          filePaths,
        },
      ) => {
        if (canceled) {
          return;
        }
        window.PLUGIN.handleFiles({
          inputs: {
            filePaths,
          },
          ticket,
          ...pluginAPIs,
        });
      });
    }
  };
  
  const styles = `
    ${fontsCss}

    body {
      font-family: Roboto;
    }
  `;

  addStyles({ styles, document });

  const body = document.querySelector('body');

  body.appendChild(scriptNode);
}

ipcRenderer.once('new-plugin-loaded', async (event, {
  pluginKey,
  inDevelopment,
  devPluginUrl,
  allowedExtensions,
  filePaths,
  ticket,
  mainId,
  selfId,
}) => {
  const user = await store.get('user');
  const { token } = user || {};
  // Context var which provides simple methods to communicate with main app
  const context = {
    pdf: hummus,
    settings: {
      get: async () => {
        const settings = await store.get(`settings.${pluginKey}`);
        return settings;
      },
      set: async (values) => {
        if (values && typeof values === 'object' && values.constructor === Object) {
          await updateSettingsStore({
            key: pluginKey,
            values,
          });
        }
      },
    },
    token,
    selfDir: path.join(PLUGINS_DIR, pluginKey),
    // Fires desktop notification with given message
    notify: (message) => {
      new Notification('Deskfiler', { // eslint-disable-line no-new
        title: `Plugin ${pluginKey}`,
        body: message,
      });
    },
    // Opens a modal asking user input
    readUserInput: options => new Promise((resolve) => {
      ipcRenderer.sendTo(mainId, 'open-input-modal', { fromId: selfId, options });

      ipcRenderer.once('input-response', (ev, values) => {
        resolve(values);
      });
    }),
    // Logs to plugin's log file
    log: ({
      action,
      meta,
    }) => {
      const logFile = path.join(LOGS_DIR, `${pluginKey}-logs.json`);

      const logs = JSON.parse(fs.readFileSync(logFile));

      const newLog = {
        timestamp: Date.now(),
        action,
        meta: meta || { type: 'string', value: 'none' },
      };

      const newLogs = [
        ...logs,
        newLog,
      ];

      fs.writeFileSync(logFile, JSON.stringify(newLogs, null, 2));
    },
    openDialog: ({ options, properties }) => new Promise((resolve, reject) => {
      ipcRenderer.sendTo(mainId, 'open-dialog', {
        fromId: selfId,
        options,
        properties,
      });

      ipcRenderer.once('open-dialog-response', async (
        ev,
        {
          canceled,
          filePaths,
        },
      ) => {
        if (canceled) {
          reject(new Error('Dialog cancelled'));
        }
        resolve(filePaths[0]);
      });
    }),
    openPaymentWindow: userId => new Promise((resolve) => {
      ipcRenderer.send('open-payment-window', { fromId: selfId, userId });
      ipcRenderer.once('payment-recieved', async () => {
        const { ticket } = await getPluginInfo({ pluginKey, token });
        resolve(ticket);
      });
    }),
    readFilePath: options => new Promise((resolve, reject) => {
      ipcRenderer.sendTo(mainId, 'save-dialog', {
        fromId: selfId,
        options: options || {},
      });

      ipcRenderer.once('save-response', (
        ev,
        {
          canceled,
          filePath,
        },
      ) => {
        if (!canceled) {
          const { dir } = path.parse(filePath);
          if (options && options.file) {
            fs.writeFile(filePath, options.file, (err) => {
              if (err) {
                reject(new Error('File save error'));
              }
            });
          }
          resolve({
            dirPath: dir,
            filePath,
          });
        } else {
          reject();
        }
      });
    }),
    openOutputFolder: filePath => new Promise((resolve, reject) => {
      shell.showItemInFolder(filePath);
      resolve();
    }),
    showPluginWindow: () => new Promise((resolve) => {
      currentWindow.show();
      setTimeout(() => resolve(), 1000);
    }),
    hidePluginWindow: () => {
      currentWindow.hide();
    },
    exit: () => {
      currentWindow.close();
    },
    alert: (data) => {
      if (typeof data === 'string' || Array.isArray(data)) {
        ipcRenderer.sendTo(mainId, 'open-alert-modal', { fromId: selfId, pluginKey, data });
        return;
      }
      throw new Error('Invalid argument type for "alert" method. Can only be a string or an array');
    },
    focus: () => {
      currentWindow.focus();
    },
    startProgress: (steps = -1) => {
      ipcRenderer.sendTo(mainId, 'plugin-start-progress', { fromId: selfId, pluginKey, steps });
    },
    setProgressStep: (step) => {
      ipcRenderer.sendTo(mainId, 'plugin-step-progress', { fromId: selfId, pluginKey, step });
    },
    setProgressETA: (eta) => {
      ipcRenderer.sendTo(mainId, 'plugin-eta-progress', { fromId: selfId, pluginKey, eta });
    },
    finishProgress: () => {
      ipcRenderer.sendTo(mainId, 'plugin-finish-progress', { fromId: selfId, pluginKey });
    },
    resetProgress: () => {
      ipcRenderer.sendTo(mainId, 'plugin-reset-progress', { fromId: selfId, pluginKey });
    },
  };

  // Final object with plugin APIs
  const pluginAPIs = {
    system: {
      fs,
      path,
      shell,
    },
    context,
  };

  injectPlugin({
    allowedExtensions,
    pluginKey,
    inDevelopment,
    devPluginUrl,
    filePaths,
    ticket,
    pluginAPIs,
    mainId,
    selfId,
  });
});
