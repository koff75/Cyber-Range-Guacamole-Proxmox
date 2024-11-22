/**
 * @fileoverview
 * Ce script établit une connexion SSH avec un serveur distant, exécute une commande pour
 * trouver une adresse IP spécifique à partir de la sortie de la commande `ip a`, et
 * extrait et affiche ensuite l'adresse IP.
 *
 * @description
 * - Se connecte au serveur distant en utilisant SSH.
 * - Exécute la commande `ip a | grep -i 147` pour trouver les lignes contenant des adresses IP
 *   relatives à '147'.
 * - Analyse la sortie de la commande pour extraire l'adresse IP.
 * - Utilise la bibliothèque `ssh2` pour la communication SSH.
 *
 * @requires ssh2
 *
 * @example
 * npm install ssh2
 *
 * @version 1.0.0
 * @date 2024-07-26
 * @auteur Nicolas Barthere
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client } = require('ssh2');


export const getIpAddress = (sshHost, sshUsername, sshPassword, lxcId) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      const command = `pct exec ${lxcId} -- ip addr | grep -E '147|192'`;

      conn.exec(command, (err, stream) => {
        if (err) return reject(err);

        let output = '';
        stream.on('data', (data) => {
          output += data.toString();
        });

        stream.on('close', () => {
          conn.end();
          const ipRegex = /inet\s+(\d+\.\d+\.\d+\.\d+)/;
          const match = output.match(ipRegex);
          resolve(match ? match[1] : 'No IP Address found');
        });
      });
    }).on('error', reject).connect({
      host: sshHost,
      port: 22,
      username: sshUsername,
      password: sshPassword,
      readyTimeout: 5000 // 5 secondes pour établir la connexion
    });
  });
};

// Exemple d'utilisation de la fonction
// const sshHost = 'xxx';
// const sshUsername = 'xxx';
// const sshPassword = 'xxx';
// const lxcId = 2004;
// const monIP = await getIpAddress(sshHost, sshUsername, sshPassword, lxcId);
// console.log(monIP);
