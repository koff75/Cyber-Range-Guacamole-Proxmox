# Cyber Range Management avec Guacamole et Proxmox

Ce projet permet de gérer une **cyber range** en utilisant **Guacamole** pour l'accès à distance (RDP) et **Proxmox** pour la gestion des conteneurs et l'accès SSH. Il intègre une série de scripts qui automatisent la gestion des utilisateurs, des connexions, ainsi que la création et le contrôle des environnements virtuels pour des simulations de cybersécurité.

## Table des matières

1. [Introduction](#introduction)
2. [Fonctionnalités](#fonctionnalités)
3. [Prérequis](#prérequis)
4. [Structure du projet](#structure-du-projet)
5. [Explication des scripts](#explication-des-scripts)
6. [Contribuer](#contribuer)
7. [Licence](#licence)

## Introduction

Ce projet vise à automatiser et orchestrer la gestion d'une cyber range, facilitant ainsi la création et la gestion de plusieurs environnements de test virtuels. Il interagit avec l'API de **Guacamole** pour la gestion des connexions RDP et SSH, et avec l'API **Proxmox** pour la gestion des conteneurs (machines virtuelles). Ces environnements virtuels sont utilisés pour des simulations et des exercices pratiques en cybersécurité. L'outil sait répartir la charge des machines à créer sur les noeuds du cluster en fonction de certains critères techniques. Il permet en quelques minutes de créer ou supprimer des utilisateurs en lot, simplement en renseignant le nom de l'entreprise. Un fichier texte sera créé avec tous les identifiants / mots de passe du lot d'utilisateurs concerné. Très utile pour gérer des lots de plus de 20 à 50 machines par client à répartir intelligemment sur le cluster.

## Fonctionnalités

- **Gestion des utilisateurs et connexions dans Guacamole** :
  - Création et suppression d'utilisateurs dans Guacamole.
  - Création et gestion des connexions RDP et SSH.

- **Gestion des environnements Proxmox** :
  - Clonage, démarrage, arrêt et suppression de conteneurs Proxmox via l'API.
  - Vérification de l'état des ressources des nœuds Proxmox pour une meilleure répartition.

- **Automatisation des processus de cyber range** :
  - Création automatisée de rapports sur l'état des utilisateurs et des connexions.
  - Gestion des environnements virtuels pour des tests d'intrusion ou des simulations d'attaques.

## Prérequis

Avant d'exécuter le projet, assure-toi d'avoir les éléments suivants installés :

- **Node.js** (version 12.x ou supérieure)
- **NPM** (Node Package Manager)
- **Guacamole** configuré avec l'API activée pour la gestion des utilisateurs et des connexions.
- **Proxmox** configuré avec une API accessible pour la gestion des conteneurs.

## Structure du projet

Voici un aperçu de la structure du projet :

```
.
├── guacamole.js        # Gestion des utilisateurs et connexions Guacamole
├── ssh.js               # Gestion des connexions SSH vers les conteneurs Proxmox
├── proxmox.js           # Gestion des conteneurs Proxmox via l'API
├── main.js              # Orchestrateur principal de la cyber range
└── README.md            # Ce fichier
```

## Explication des scripts

### `main.js` - Orchestrateur principal

Le fichier **`main.js`** est l'orchestrateur central du projet. Il est responsable de la gestion des conteneurs Proxmox et des utilisateurs Guacamole. Voici les principales actions qu'il effectue :

- **Démarrer des conteneurs** : Ce script interagit avec l'API Proxmox pour démarrer un conteneur en utilisant son identifiant. Il vérifie également l'état des ressources disponibles sur les nœuds Proxmox avant d'effectuer toute action.
  
- **Cloner des conteneurs** : Il permet de cloner des conteneurs existants pour créer de nouveaux environnements de test à partir d'un modèle de conteneur spécifié. Cela permet de répliquer rapidement un environnement de test pour plusieurs utilisateurs.

- **Arrêter ou supprimer des conteneurs** : Ce script permet également de gérer les cycles de vie des conteneurs, en les arrêtant ou en les supprimant une fois les tests terminés.

- **Coordination avec Guacamole** : Bien qu'il se concentre principalement sur l'infrastructure des conteneurs, il interagit également avec les autres scripts (comme `guacamole.js`) pour gérer l'accès des utilisateurs aux environnements virtuels via des connexions RDP.

### `guacamole.js` - Gestion des utilisateurs et des connexions

Le fichier **`guacamole.js`** gère toutes les interactions avec l'API de **Guacamole**. Ce fichier permet de :

- **Créer des utilisateurs** : Le script permet de créer de nouveaux utilisateurs dans Guacamole, avec des informations d'identification spécifiées et des permissions associées.

- **Supprimer des utilisateurs** : Il permet également de supprimer des utilisateurs existants de Guacamole.

- **Créer des connexions** : Le script configure des connexions **RDP** pour chaque utilisateur, en permettant l'accès aux conteneurs Proxmox ou autres machines virtuelles.

- **Générer des rapports** : Un des rôles clés du fichier est de générer des rapports complets sur l'état des utilisateurs et des connexions, permettant de suivre l'utilisation et la gestion des connexions dans la cyber range.

### `ssh.js` - Gestion des connexions SSH

Le fichier **`ssh.js`** gère les connexions SSH vers les conteneurs créés sur Proxmox. Il exécute des commandes distantes via SSH pour interagir avec les conteneurs ou autres machines virtuelles dans l'environnement de test. Ce script peut être utilisé pour :

- **Se connecter à un conteneur** : Il établit une connexion SSH sécurisée vers un conteneur spécifique, permettant d'exécuter des commandes à distance sur cet environnement.

- **Automatiser des actions distantes** : Une fois connecté, il peut exécuter des scripts ou des commandes sur le conteneur, facilitant ainsi l'automatisation des tests de pénétration ou d'autres exercices en cybersécurité.

### `proxmox.js` - Gestion des conteneurs Proxmox

Le fichier **`proxmox.js`** interagit directement avec l'API de **Proxmox** pour effectuer des opérations sur les conteneurs. Les fonctionnalités clés incluent :

- **Création de conteneurs** : Ce script permet de créer de nouveaux conteneurs sur un serveur Proxmox, en clonant des modèles ou en définissant des configurations spécifiques pour chaque environnement.

- **Gestion des ressources** : Avant de créer ou démarrer un conteneur, il vérifie l'état des ressources (mémoire, CPU, etc.) sur les nœuds Proxmox afin d'éviter la surcharge des ressources.

- **Démarrage et arrêt des conteneurs** : Il offre la possibilité de démarrer ou d'arrêter des conteneurs selon les besoins, facilitant la gestion des environnements de test.

- **Suppression des conteneurs** : Une fois les tests terminés, le script permet de supprimer les conteneurs pour libérer les ressources.
