import inquirer from 'inquirer';
import { cloneAndStartContainers, deleteContainersForSelectedCompany } from './proxmox.js';
import { createGuacamoleAccounts } from './guacamole.js'; 
import { styleText } from 'node:util';
import gradient from 'gradient-string';


// ==========================================================================================
// ==========================================================================================
console.log(styleText(['bgBlue', 'black'], '  Bienvenue dans la Cyber Range Manager !  '));
const border = styleText('blueBright', '╔══════════════════════════════════════════════╗\n║                                              ║\n╚══════════════════════════════════════════════╝\n');
const title = styleText(['bold', 'blueBright'], '  Bienvenue dans la Cyber Range Manager !  ');
console.log(border + '║' + title + '║\n' + border);
const titleGradient = gradient(['#f72585', '#4361ee', '#4cc9f0'])(
    '  Bienvenue dans la Cyber Range Manager !  '
);
console.log(border + '║' + titleGradient + '║\n' + border); // ==========================================================================================


// Menu principal
const mainMenu = async () => {
    try {
      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'Choose an action:',
        choices: [
          'Create accounts',
          'Delete accounts'
        ]
      });
  
      if (action === 'Create accounts') {
        // Code pour créer les comptes
        const { companyName } = await inquirer.prompt({
          type: 'input',
          name: 'companyName',
          message: 'Enter the company name:'
        });
        let { numAccounts } = await inquirer.prompt({
          type: 'number',
          name: 'numAccounts',
          message: 'Enter the number of accounts to create:',
          validate: (input) => {
            if (input < 1) return 'Number of accounts must be at least 1.';
            if (input > 50) return 'Number of accounts cannot exceed 50.';
            return true;
          }
        });
  
        // Assurer que le nombre de comptes est au maximum de 50
        numAccounts = Math.min(numAccounts, 50);
  
        // Appeler la fonction pour créer des comptes
        const containers = await cloneAndStartContainers(companyName, numAccounts);
  
        // ========= PARTIE GUACAMOLE ========
        // Création des comptes et des connexions avec les infos du retour de cloneAndStartContainers
        await createGuacamoleAccounts(containers);

      } else if (action === 'Delete accounts') {
        // Appeler la fonction pour supprimer les conteneurs et les comptes Guacamole
        // Va dans le fichier proxmox.js pour la suite du prompt terminal
        // Gère les conteneurs, puis gère les comptes Guaca
        await deleteContainersForSelectedCompany();
      }
  
    } catch (error) {
      console.error('Error in the main menu:', error);
    }
  };
  
  mainMenu().catch(console.error);