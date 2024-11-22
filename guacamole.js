/**
 * @fileoverview
 * Ce script interagit avec l'API Guacamole pour gérer les utilisateurs et les connexions RDP. Il permet de :
 * - Obtenir un token d'authentification.
 * - Vérifier si une connexion ou un utilisateur existe.
 * - Créer des utilisateurs et des connexions RDP dans Guacamole.
 * - Lier les utilisateurs aux connexions créées.
 * - Assurer la présence de répertoires nécessaires et générer un bilan des comptes créés.
 *
 * @description
 * - Se connecte à l'API Guacamole avec les informations d'identification fournies.
 * - Vérifie l'existence des connexions et des utilisateurs.
 * - Crée des utilisateurs et des connexions RDP si nécessaire.
 * - Lie les utilisateurs aux connexions et génère un résumé des comptes créés.
 * - Crée et gère des répertoires pour stocker le bilan des comptes.
 *
 * @requires axios
 * @requires fs
 * @requires path
 *
 * @example
 * // Assurez-vous que les dépendances sont installées :
 * npm install axios
 *
 *
 * @version 1.0.0
 * @date 2024-07-26
 * @auteur Nicolas Barthere
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Paramétrage du Guacamole
const guacBaseUrl = 'http://xxx:8080/api';
const adminUsername = 'xxx';
const adminPassword = 'xxx';
const dataSource = 'mysql';

// Fonction pour obtenir un token d'authentification
const getAuthToken = async () => {
  try {
    const response = await axios.post(`${guacBaseUrl}/tokens`, new URLSearchParams({
      username: adminUsername,
      password: adminPassword
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data && response.data.authToken) {
      console.log('Auth token retrieved successfully.');
      return response.data.authToken;
    } else {
      throw new Error('Auth token not found in response.');
    }
  } catch (error) {
    console.error('Failed to get auth token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Fonction pour vérifier si une connexion existe
const connectionExists = async (token, name) => {
    try {
      const response = await axios.get(`${guacBaseUrl}/session/data/${dataSource}/connections`, {
        params: {
          token
        }
      });
      return Object.values(response.data).find(connection => connection.name === name); // On retourne l'objet qui contient l'identifier
    } catch (error) {
      console.error(`Failed to check if connection ${name} exists:`, error.response ? error.response.data : error.message);
      throw error;
    }
  };

  
// Fonction pour vérifier si un utilisateur existe
const userExists = async (token, username) => {
  try {
    const response = await axios.get(`${guacBaseUrl}/session/data/${dataSource}/users/${username}`, {
      params: {
        token
      }
    });
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return false; // Utilisateur non trouvé
    }
    console.error(`Failed to check if user ${username} exists:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

// Fonction pour lister les connections liées à une entreprise
const listingConnectionsForACompany = async (token, name) => {
  try {
    const response = await axios.get(`${guacBaseUrl}/session/data/${dataSource}/connections`, {
      params: {
        token
      }
    });
    // Chercher toutes les connexions dont le nom contient `name`
    const connections = Object.values(response.data).filter(connection => connection.name.includes(name));
    return connections;  } catch (error) {
      console.error(`Failed to list connections for company ${name}:`, error.response ? error.response.data : error.message);
      throw error;
  }
};


// Fonction pour créer un utilisateur
const createUser = async (token, username, password) => {
  try {
    await axios.post(`${guacBaseUrl}/session/data/${dataSource}/users`, {
      username,
      password,
      attributes: {
        'guac-full-name': username,
        'guac-organization': 'RDP client'
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        token
      }
    });

    console.log(`User ${username} created successfully.`);
  } catch (error) {
    console.error(`Failed to create user ${username}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

// Fonction pour supprimer un utilisateur
const deleteUser = async (token, username) => {
  try {
    await axios.delete(`${guacBaseUrl}/session/data/${dataSource}/users/${username}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        token
      }
    });

    console.log(`User ${username} deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete user ${username}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

// Fonction pour créer une connexion RDP
const createConnection = async (token, name, ip) => {
  try {
    const response = await axios.post(`${guacBaseUrl}/session/data/${dataSource}/connections`, {
  "parentIdentifier": "ROOT",
  "name": name,
  "protocol": "rdp",
  "parameters": {
    "port": "3389",
    "read-only": "",
    "swap-red-blue": "",
    "cursor": "",
    "color-depth": "",
    "clipboard-encoding": "",
    "disable-copy": "",
    "disable-paste": "",
    "dest-port": "",
    "recording-exclude-output": "",
    "recording-exclude-mouse": "",
    "recording-include-keys": "",
    "create-recording-path": "",
    "enable-sftp": "",
    "sftp-port": "",
    "sftp-server-alive-interval": "",
    "enable-audio": "",
    "security": "",
    "disable-auth": "",
    "ignore-cert": "",
    "gateway-port": "",
    "server-layout": "",
    "timezone": "",
    "console": "",
    "width": "",
    "height": "",
    "dpi": "",
    "resize-method": "",
    "console-audio": "",
    "disable-audio": "",
    "enable-audio-input": "",
    "enable-printing": "",
    "enable-drive": "",
    "create-drive-path": "",
    "enable-wallpaper": "",
    "enable-theming": "",
    "enable-font-smoothing": "",
    "enable-full-window-drag": "",
    "enable-desktop-composition": "",
    "enable-menu-animations": "",
    "disable-bitmap-caching": "",
    "disable-offscreen-caching": "",
    "disable-glyph-caching": "",
    "preconnection-id": "",
    "hostname": ip,
    "username": "root",
    "password": "extia",
    "domain": "",
    "gateway-hostname": "",
    "gateway-username": "",
    "gateway-password": "",
    "gateway-domain": "",
    "initial-program": "",
    "client-name": "",
    "printer-name": "",
    "drive-name": "",
    "drive-path": "",
    "static-channels": "",
    "remote-app": "",
    "remote-app-dir": "",
    "remote-app-args": "",
    "preconnection-blob": "",
    "load-balance-info": "",
    "recording-path": "",
    "recording-name": "",
    "sftp-hostname": "",
    "sftp-host-key": "",
    "sftp-username": "",
    "sftp-password": "",
    "sftp-private-key": "",
    "sftp-passphrase": "",
    "sftp-root-directory": "",
    "sftp-directory": ""
  },
  "attributes": {
    "max-connections": "",
    "max-connections-per-user": "",
    "weight": "",
    "failover-only": "",
    "guacd-port": "",
    "guacd-encryption": "",
    "guacd-hostname": ""
  }
}, {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        token
      }
    });

    console.log(`Connection ${name} created successfully.`);
    // Récupérer l'ID de la connexion créée
    return response.data.identifier; // Retourne l'ID de la connexion pour la lier à l'utilisateur après
  } catch (error) {
    console.error(`Failed to create connection ${name}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};


// Fonction pour supprimer une connexion
const deleteConnection = async (token, connectionId) => {
  try {
    if (!connectionId) throw new Error('ConnectionId are required');

    const url = `${guacBaseUrl}/session/data/${dataSource}/connections/${connectionId}`;
    await axios.delete(url, { params: { token } });
    console.log(`Connection ID ${connectionId} deleted successfully.`);
  } catch (error) {
    const message = error.response
      ? `Failed to delete connection ID ${connectionId}: ${error.response.status} ${error.response.statusText}`
      : `Failed to delete connection ID ${connectionId}: ${error.message}`;
    console.error(message);
    throw error;
  }
};



// Fonction pour lier un utilisateur à une connexion
const linkUserToConnection = async (token, username, connectionId) => {
    try {
      await axios.patch(`${guacBaseUrl}/session/data/${dataSource}/users/${username}/permissions`, [
        {
          "op": "add",
          "path": `/connectionPermissions/${connectionId}`,
          "value": "READ"
        }
      ], {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          token
        }
      });
  
      console.log(`User ${username} linked to connection ${connectionId} successfully.`);
    } catch (error) {
      console.error(`Failed to link user ${username} to connection ${connectionId}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  };


  
// Fonction pour s'assurer que le répertoire existe, le créer si nécessaire
const ensureDirectoryExists = (dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create directory: ${dirPath}`, error.message);
      throw error;
    }
  };
  
  // Fonction pour obtenir le répertoire courant
  const getCurrentDirectory = () => {
    return path.resolve('.'); // Utilise le répertoire courant du script
  };
  const outputDir = getCurrentDirectory();
  ensureDirectoryExists(outputDir);
  
  // Créer un sous-répertoire spécifique :
  const specificDir = path.join(outputDir, 'output');
  ensureDirectoryExists(specificDir);

// Fonction pour afficher le bilan des comptes créés et l'enregistrer dans un fichier
const displaySummary = (accounts) => {
    // Vérifier que companyName est défini et est une chaîne
    const sanitizedCompanyName = (accounts[0].username && typeof accounts[0].username === 'string')
    ? accounts[0].username.split('-')[0].replace(/[^a-z0-9\-]/gi, '-')
    : 'undefined_company'; // Valeur par défaut si username est invalide
    
    const outputDir = getCurrentDirectory();
    ensureDirectoryExists(outputDir);
  
    const outputPath = path.join(outputDir, `${sanitizedCompanyName}_bilan_comptes.txt`);
    
    let summary = '--- Bilan des Comptes Créés ---\n\n';
  
    accounts.forEach(account => {
      summary += `Utilisateur: ${account.username}\n`;
      summary += `Mot de passe: ${account.password}\n`;
      summary += `Connexion: ${account.connectionName}\n`;
      summary += `IP: ${account.ip}\n`;
      summary += '------------------------------\n\n';
    });
  
    // Écrire le résumé dans le fichier
    fs.writeFile(outputPath, summary, (err) => {
      if (err) {
        console.error('Failed to write summary to file:', err.message);
      } else {
        console.log(`Summary written to ${outputPath}`);
      }
    });
  };
  


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

// Fonction principale pour créer des utilisateurs et les connexions
export const createGuacamoleAccounts = async (containers) => {
  const createdAccounts = [];
  try {
    const token = await getAuthToken();

    for (const container of containers) {
      const { hostname, ip } = container;
      const password = `${hostname}`; // Il est possible de rajouter des lettres pour modifier le mdp user

      let connectionId;
      
      // Vérifier si la connexion existe
      const existingConnection = await connectionExists(token, hostname);
      // Créer la connexion Guacamole si elle n'existe pas
      if (!existingConnection) {
        connectionId = await createConnection(token, hostname, ip);
      } else {
        console.log(`Connection ${hostname} already exists.`);
        connectionId = existingConnection.identifier; // Récupérer l'ID de la connexion existante
      }

      // Vérifier si l'utilisateur existe
      const exists = await userExists(token, hostname);
      // Si l'utilisateur n'existe pas, le créer
      if (!exists) {
        await createUser(token, hostname, password);
      } else {
        console.log(`User ${hostname} already exists.`);
      }

      // Lier l'utilisateur à la connexion
      await linkUserToConnection(token, hostname, connectionId);

      // Ajouter au bilan
      createdAccounts.push({
            username: hostname,
            password,
            connectionName: hostname,
            ip
      });

    }
  } catch (error) {
    console.error('Failed to create Guacamole accounts:', error.response ? error.response.data : error.message);
  }

    // Afficher le bilan
    displaySummary(createdAccounts);
};

// Fonction principale pour créer des utilisateurs ET les connexions associées
export const deleteGuacamoleAccounts = async (companyName) => {
  try {
    // Obtenir un token pour se connecter à Guacamole
    const token = await getAuthToken();
    // Obtenir la liste des connections pour une entreprise sélectionnée
    const containerListFiltered = await listingConnectionsForACompany(token, companyName);
    // Parcours la liste des comptes pour une entreprise donnée
    for (const container of containerListFiltered) { 
      // Vérifier si la connexion existe
      const existingConnection = await connectionExists(token, container.name);
      // Créer la connexion Guacamole si elle n'existe pas
      if (existingConnection) {
        // Suppression de la connection
        await deleteConnection(token, existingConnection.identifier);
      } else {
        console.log(`Connection ${container.name} already deleted.`);
      }

      // Vérifier si l'utilisateur existe
      const exists = await userExists(token, container.name);
      // Si l'utilisateur existe, le supprimer
      if (exists) {
        await deleteUser(token, container.name);
      } else {
        console.log(`User ${container.name} already deleted.`);
      }
    }
  } catch (error) {
    console.error('Failed to delete Guacamole accounts:', error.response ? error.response.data : error.message);
  }
};
// Jeux de tests :
//  const containers = [
//    { name: 'extia-1', ip: '192.168.1.101' },
//  ];
//  deleteGuacamoleAccounts(containers);
