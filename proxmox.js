/**
 * @fileoverview
 * Ce script interagit avec l'API Proxmox pour gérer les conteneurs. Il permet de :
 * - Trouver le prochain ID disponible pour les nouveaux conteneurs.
 * - Cloner et démarrer des conteneurs à partir d'un template.
 * - Supprimer les conteneurs associés à une entreprise sélectionnée.
 *
 * @description
 * - Se connecte à l'API Proxmox avec les informations d'identification fournies.
 * - Trouve le prochain ID disponible pour les nouveaux conteneurs (à partir de 2000).
 * - Clône les conteneurs à partir d'un template spécifié et les démarre.
 * - Supprime les conteneurs associés à une entreprise sélectionnée après avoir arrêté ceux en cours d'exécution.
 *
 * @requires proxmox-api
 * @requires process
 * @requires inquirer
 *
 * @example
 * // Assurez-vous que les dépendances sont installées :
 * npm install proxmox-api inquirer
 *
 *
 * @version 1.0.0
 * @date 2024-07-26
 * @auteur Nicolas Barthere
 */

import proxmoxApi from 'proxmox-api';
import process from 'process';
import inquirer from 'inquirer';
import { getIpAddress } from './ssh.js';
import { deleteGuacamoleAccounts } from './guacamole.js'; 

// Bypass le manque de certificat SSL pour Proxmox
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// SENSIBLE | Informations pour l'API Proxmox
const promox = proxmoxApi({
  host: 'xxx',
  port: 8006,
  username: 'root@pam',
  password: 'xxx'
});

// SENSIBLE | Informations pour SSH Proxmox
const sshUsername = "xxx";
const sshPassword = "xxx";
const sshHost = "xxx" // Proxmox09

// Liste des nœuds Proxmox gestion dynamique
const proxmoxNodes = [
  { name: 'proxmox00', templateID : 155, ip: '147.16.16.14'}, 
 // { name: 'proxmox01', templateID : '156', ip: '192.168.0.101'}, 
 // { name: 'proxmox02', templateID : '157', ip: '192.168.0.102'},
  { name: 'proxmox03', templateID : 123, ip: '147.16.16.13'},
  { name: 'proxmox04', templateID : 150, ip: '147.16.16.144'},
 // { name: 'proxmox05', templateID : '159', ip: '147.16.16.14'},
  { name: 'proxmox06', templateID : 124, ip: '147.16.16.106'},
  { name: 'proxmox07', templateID : 161, ip: '147.16.16.11'},
  { name: 'proxmox08', templateID : 125, ip: '147.16.16.108'},
  { name: 'proxmox09', templateID : 103, ip: '147.16.16.57'}
];
const nodeName = 'proxmox09'; // Nom du nœud Proxmox qui porte le template Kali LXC
const templateId = 103; // ID du template de conteneur Kali qui être clôné

// Configuration minimale requise pour un conteneur (se référer au LCX kali-container 103)
const minRequiredResources = {
  memory: 2048 * 1024 * 1024, // Converti en octets (2048 Mo)
  disk: 20 * 1024 * 1024 * 1024 // Converti en octets (20 Go)
};
// Poids pour chaque type de ressource dans le calcul du score
const resourceWeights = {
  cpu: 2,    // Priorité plus élevée pour le CPU
  memory: 1, 
  disk: 0.5  // Priorité plus faible pour l'espace disque
};
// Seuil minimal de ressources libres pour considérer un nœud comme viable
const minFreeResourceThreshold = {
  cpu: 0.2,  // Au moins 20% de CPU libre
  memory: 0.1, // Au moins 10% de RAM libre
  disk: 0.05 // Au moins 5% d'espace disque libre
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =====================================================================

// Fonction pour trouver le meilleur nœud pour cloner le conteneur
async function findBestNodeForCloning() {
  let bestNode = null;
  let bestScore = -Infinity;

  for (const node of proxmoxNodes) {
      try {
          const nodeStatus = await promox.nodes.$(node.name).status.$get();
          const freeResources = {
              cpu: parseFloat(nodeStatus.cpu.toFixed(1)),
              memory: nodeStatus.memory.free, // En octets
              disk: nodeStatus.rootfs.free // En octets
          };

          // Vérifier si les ressources minimales sont satisfaites ET si le nœud a suffisamment de ressources libres
          if (
              freeResources.cpu < 0.9 && // Si l'usage actuel ne dépasse pas 90% d'utilisation CPU
              freeResources.memory >= minRequiredResources.memory &&
              freeResources.memory >= freeResources.memory * minFreeResourceThreshold.memory &&
              freeResources.disk >= minRequiredResources.disk &&
              freeResources.disk >= freeResources.disk * minFreeResourceThreshold.disk
          ) {
              // Calculer un score pondéré en fonction des ressources disponibles et des poids
              const score = freeResources.cpu * resourceWeights.cpu + 
                            freeResources.memory * resourceWeights.memory + 
                            freeResources.disk * resourceWeights.disk;

              if (score > bestScore) {
                  bestNode = node;
                  bestScore = score;
              }
          }
      } catch (error) {
          console.error(`Erreur lors de la vérification du nœud ${node.name}:`, error.response?.data || error.message);
          // En cas d'erreur, marquer le nœud comme indisponible (par exemple, en ajoutant une propriété `available: false`)
          node.available = false;
      }
  }

  return bestNode;
}

// Fonction pour trouver le prochain ID disponible (à partir de 2000)
const findNextAvailableId = async (startId = 2000) => {
  try {
    // Créer une liste de promesses pour récupérer les conteneurs de chaque nœud
    const containerPromises = proxmoxNodes.map(node =>
      promox.nodes.$(node.name).lxc.$get()
    );

    // Attendre que toutes les promesses se résolvent
    const results = await Promise.all(containerPromises);

    // Trouver le plus grand ID parmi tous les conteneurs
    const maxId = results.flat().reduce((max, container) => {
      const id = Number(container.vmid); // Convertir vmid en nombre
      return id > max ? id : max;
    }, startId - 1);

    // Trouver le prochain ID disponible
    const nextId = maxId + 1;

    console.log(`Next available ID is ${nextId}`);
    // Renvoyer le max actuel
    return nextId;
  } catch (error) {
    console.error('Failed to find the next available ID:', error.response?.data || error.message);
    throw error;
  }
};

// Fonction pour cloner et démarrer les conteneurs
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const cloneAndStartContainers = async (companyName, numAccounts) => {
  try {
    // Trouver le meilleur nœud Proxmox avant le clonage
    const bestNode = await findBestNodeForCloning();

    if (bestNode) {
      // Récupérer la liste des conteneurs (LXC) sur le nœud pour rechercher le template Kali
      const containers = await promox.nodes.$(bestNode.name).lxc.$get();
      // Trouver le template de conteneur avec l'ID donné
      const template = containers.find(container => container.template && container.vmid === bestNode.templateID);

      if (template) {
        console.log(`Template container with ID ${bestNode.templateID} found: ${template.name}`);

        // Vérifier et désactiver la protection si nécessaire
        const { protection } = await promox.nodes.$(bestNode.name).lxc.$(bestNode.templateID).config.$get();
        if (protection) {
          console.log(`Protection mode is enabled for container ${bestNode.templateID}. Disabling protection...`);
          await promox.nodes.$(bestNode.name).lxc.$(bestNode.templateID).config.$put({ protection: 0 });
        }

        // Cloner les conteneurs
        const clonedContainers = [];
        const nextAvailableId = await findNextAvailableId();

        for (let i = 1; i <= numAccounts; i++) {
          const newId = nextAvailableId + i; // ID pour le clonage
          const hostname = `${companyName}-${i}`; // Nom pour le clonage

          let attempt = 0;
          let success = false;
          while (attempt < 5 && !success) { // Essayer jusqu'à 5 fois en cas d'échec
            try {
              // Clonage du template Kali sur le noeud Promox09
              await promox.nodes.$(bestNode.name).lxc.$(bestNode.templateID).clone.$post({
                newid: newId,
                hostname: hostname,
                full: false,
                target: bestNode.name, // destination
                description: `VM for ${companyName} account ${i}`
              });
              await delay(5000); // Attendre 5 secondes que le clonage soit terminé

              // // Migration du clone sur le noeud qui porte le plus d'espace
              // await promox.nodes.$(nodeName).lxc.$(newId).migrate.$post({
              //   target: bestNode.name, // Destination du clone à migrer
              // });
              // await delay(240000); // Attendre 4 minutes que la miagration soit terminé

              console.log(`Container ${hostname} to ${bestNode.name} cloned successfully.`);
              clonedContainers.push(newId);
              success = true; // Sortir de la boucle en cas de succès
            } catch (error) {
              // Vérifier si l'erreur indique que le conteneur est verrouillé
              if (error.message.includes('CT is locked (disk)')) {
                if (attempt === 3 || attempt === 4) console.error(`Container template ${bestNode.templateID} is locked (disk). Waiting and retrying...`);
                await delay(5000); // Attendre 5 secondes avant de réessayer pour que le disque template se libère
                attempt++;
              } else {
                console.error(`Failed to clone container ${hostname}:`, error.response?.data || error.message);
                break; // Sortir de la boucle en cas d'erreur autre que le verrouillage
              }
            }
          }

          // En cas d'échec après plusieurs tentatives, enregistrer un message d'erreur
          if (!success) {
            console.error(`Failed to clone container ${hostname} after multiple attempts.`);
          }
        }

        // Démarrer les conteneurs clonés
        for (const id of clonedContainers) {
          try {
            await sleep(10000);
            // Démarrage sur le noeud qui porte le plus d'espace disponible
            await promox.nodes.$(bestNode.name).lxc.$(id).status.start.$post();
            console.log(`Container with ID ${id} started successfully.`);
          } catch (startError) {
            console.error(`Failed to start container with ID ${id}:`, startError.response?.data || startError.message);
          }
        }

        // Réactiver la protection si elle était activée auparavant
        if (protection) {
          console.log('Re-enabling protection mode for the template...');
          await promox.nodes.$(bestNode.name).lxc.$(bestNode.templateID).config.$put({ protection: 1 });
          console.log('Protection mode re-enabled.');
        }

        // Récupérer les détails des conteneurs clonés
        const containerDetails = [];
        for (const id of clonedContainers) {
          try {
            // Récupérer la config du LXC cloné
            const details = await promox.nodes.$(bestNode.name).lxc.$(id).config.$get();
            // Les conteneurs sont en cours de lancement, le DHCP prend du temps
            console.log('Getting DHCP for all containers...');
            await sleep(10000);
            // On appelle ssh.js pour récupérer l'IP du conteneur
            const ip = await getIpAddress(bestNode.ip, sshUsername, sshPassword, id);
            console.log(`Container with ID ${id} has an IP ${ip}`);
            containerDetails.push({ id, hostname: details.hostname, ip });
          } catch (detailsError) {
            console.error(`Failed to get details for container with ID ${id}:`, detailsError.response?.data || detailsError.message);
          }
        }

        return containerDetails;
      } else {
        console.log(`Container template with ID ${bestNode.templateID} not found on node ${bestNode.name}.`);
        return [];
      }
    } else {
        console.error("Aucun nœud n'a suffisamment de ressources pour cloner le conteneur.");

        // Options possibles :
        // - Ajouter des ressources aux nœuds existants
        // - Killer des sessions
        // - Attendre que des ressources se libèrent sur un nœud (avec une boucle et un délai)
    }
  } catch (error) {
    console.error('Failed to check container template existence or clone:', error.response?.data || error.message);
    return [];
  }
};









// ============================== DELETE CONTAINER + COMPTE GUACA ============================================
// ==========================================================================================
// Fonction principale pour gérer la suppression des conteneurs
export const deleteContainersForSelectedCompany = async () => {
  try {
    // Récupérer tous les conteneurs avec ID >= 2000
    const containers = await getContainersWithIdsGreaterThan(2000);

    if (containers.length === 0) {
      console.log(`No company found in Proxmox.`);
      return;
    }

    // Extraire les noms des entreprises
    const companies = extractCompanyNamesFromContainers(containers);

    // Sélectionner une entreprise à supprimer
    const selectedCompany = await selectCompanyToDelete(companies);

    // Filtrer les conteneurs pour l'entreprise sélectionnée
    const containersToDelete = containers.filter(container => container.name.startsWith(selectedCompany));

    // Éteindre et supprimer les conteneurs
    for (const container of containersToDelete) {

      // Vérifier l'état du conteneur
      const statusResponse = await promox.nodes.$(nodeName).lxc.$(container.vmid).status.current.$get();
      const status = statusResponse.status;  // 'running' ou 'stopped'

      // Arrêter le conteneur s'il est en cours d'exécution
      if (status === 'running') {
        // Arrêt du conteneur
        console.log(`Container with ID ${container.vmid} is running. Stopping it first...`);
        await promox.nodes.$(nodeName).lxc.$(container.vmid).status.stop.$post();
      }
      // Suppression du conteneur
      const success = await deleteContainer(container.vmid);
      if (!success) {
        console.error(`Failed to delete container with ID ${container.vmid}.`);
      }
    }

    // ===== Partie suppression comptes Guacamole =====
    // Suppression des comptes et des connections Guacamole
    deleteGuacamoleAccounts(selectedCompany);

  } catch (error) {
    console.error('Error in deleting containers for selected company:', error);
  }
};

// Fonction pour récupérer tous les conteneurs avec ID >= 2000
const getContainersWithIdsGreaterThan = async (minId) => {
  try {
    const containers = await promox.nodes.$(nodeName).lxc.$get();
    return containers.filter(container => container.vmid >= minId);
  } catch (error) {
    console.error(`Failed to get containers with IDs >= ${minId}:`, error.response?.data || error.message);
    throw error;
  }
};
// Fonction pour extraire les noms des entreprises à partir des conteneurs
const extractCompanyNamesFromContainers = (containers) => {
  const companyNames = new Set();
  containers.forEach(container => {
    const nameParts = container.name.split('-')[0].replace(/[^a-z0-9\-]/gi, '-')
    if (nameParts.length > 1) {
      companyNames.add(nameParts); 
    }
  });
  return Array.from(companyNames);
};

// Fonction pour sélectionner une entreprise à supprimer
const selectCompanyToDelete = async (companies) => {
  const { selectedCompany } = await inquirer.prompt({
    type: 'list',
    name: 'selectedCompany',
    message: 'Select the company to delete:',
    choices: companies
  });
  return selectedCompany;
};

const getContainerStatus = async (containerId) => {
  try {
    const status = await promox.nodes.$(nodeName).lxc.$(containerId).status.$get();
    return status.status;
  } catch (error) {
    console.error(`Failed to get status for container with ID ${containerId}:`, error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fonction pour supprimer un conteneur basé sur son ID
 * @param {number} containerId - ID du conteneur à supprimer
 */
const deleteContainer = async (containerId) => {
  try {
    // Envoi de la requête de suppression
    await promox.nodes.$(nodeName).lxc.$(containerId).$delete({
      force: true,
      purge: true
    });

    // Affichage de confirmation en cas de succès
    console.log(`Container with ID ${containerId} deleted successfully.`);
    return true;  // Indique que la suppression a réussi
  } catch (error) {
    console.error(`Failed to delete container with ID ${containerId}:`, error.response?.data || error.message);
    return false; // Indique que la suppression a échoué
  }
};

