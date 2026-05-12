/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.14-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: dbcred
-- ------------------------------------------------------
-- Server version	10.11.14-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `tb_adiantamentos`
--

DROP TABLE IF EXISTS `tb_adiantamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_adiantamentos` (
  `num_recibo` varchar(10) DEFAULT NULL,
  `id_vendedor` mediumint(9) DEFAULT NULL,
  `id` smallint(6) NOT NULL,
  `id_cobrador` mediumint(9) DEFAULT NULL,
  `dt_adiant` datetime DEFAULT NULL,
  `vl_adiant` decimal(10,2) DEFAULT NULL,
  `entidade_negocio` int(11) NOT NULL,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  KEY `fk_adiant_vendedor` (`entidade_negocio`,`id_vendedor`),
  KEY `fk_adiant_entidade` (`entidade_negocio`) USING BTREE,
  KEY `fk_adiant_cobrador` (`entidade_negocio`,`id_cobrador`),
  KEY `fk_adiant_comissoes` (`entidade_negocio`,`num_recibo`),
  CONSTRAINT `fk_adiant_cobrador` FOREIGN KEY (`entidade_negocio`, `id_cobrador`) REFERENCES `tb_cobradores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_adiant_comissoes` FOREIGN KEY (`entidade_negocio`, `num_recibo`) REFERENCES `tb_comissoes` (`entidade_negocio`, `num_recibo`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_adiant_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_adiant_vendedor` FOREIGN KEY (`entidade_negocio`, `id_vendedor`) REFERENCES `tb_vendedores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_adiantamentos`
--

LOCK TABLES `tb_adiantamentos` WRITE;
/*!40000 ALTER TABLE `tb_adiantamentos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_adiantamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_check_ano`
--

DROP TABLE IF EXISTS `tb_check_ano`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_check_ano` (
  `ano_corrente` smallint(6) NOT NULL,
  `id` smallint(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_check_ano`
--

LOCK TABLES `tb_check_ano` WRITE;
/*!40000 ALTER TABLE `tb_check_ano` DISABLE KEYS */;
INSERT INTO `tb_check_ano` VALUES
(2026,1);
/*!40000 ALTER TABLE `tb_check_ano` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_clientes`
--

DROP TABLE IF EXISTS `tb_clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_clientes` (
  `id` int(11) NOT NULL DEFAULT 0,
  `cpf_cliente` varchar(12) NOT NULL DEFAULT '',
  `nom_cliente` varchar(255) NOT NULL,
  `cel_cliente` varchar(12) DEFAULT NULL,
  `end_cliente` varchar(255) NOT NULL DEFAULT '',
  `num_cliente` varchar(10) DEFAULT NULL,
  `bai_cliente` varchar(255) NOT NULL DEFAULT '',
  `cid_cliente` varchar(255) NOT NULL,
  `uf_cliente` varchar(2) NOT NULL,
  `cep_cliente` varchar(10) NOT NULL,
  `lat_cliente` varchar(16) DEFAULT NULL,
  `lon_cliente` varchar(16) DEFAULT NULL,
  `nom_usual` varchar(100) DEFAULT NULL,
  `dat_cadastro` datetime DEFAULT NULL,
  `com_restricao_credito` tinyint(4) DEFAULT 0,
  `entidade_negocio` int(11) DEFAULT 999,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_cpf` (`cpf_cliente`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_clientes`
--

LOCK TABLES `tb_clientes` WRITE;
/*!40000 ALTER TABLE `tb_clientes` DISABLE KEYS */;
INSERT INTO `tb_clientes` VALUES
(1,'50365347515','OVIDIO BATISTA TRINDADE NETO','79988199231','AV SAO PAULO','1350','18 DO FORTE','ARACAJU','SE','49072310','','','BATISTINHA','2026-04-10 13:44:46',0,999);
/*!40000 ALTER TABLE `tb_clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_cobradores`
--

DROP TABLE IF EXISTS `tb_cobradores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_cobradores` (
  `id` mediumint(9) NOT NULL DEFAULT 0,
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  `nom_cobrador` varchar(150) NOT NULL,
  `comissao` decimal(8,2) NOT NULL DEFAULT 0.00,
  `ativo` tinyint(4) NOT NULL DEFAULT 1,
  `cel_contato` varchar(15) NOT NULL,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  CONSTRAINT `fk_entidade_cobr` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_cobradores`
--

LOCK TABLES `tb_cobradores` WRITE;
/*!40000 ALTER TABLE `tb_cobradores` DISABLE KEYS */;
INSERT INTO `tb_cobradores` VALUES
(1,1,'FRANCISCO SANTOS',9.99,1,'79988275230');
/*!40000 ALTER TABLE `tb_cobradores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_comissoes`
--

DROP TABLE IF EXISTS `tb_comissoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_comissoes` (
  `num_recibo` varchar(10) NOT NULL,
  `dt_recibo` date NOT NULL,
  `tp_recibo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'vend || cobr',
  `id_cobrador` mediumint(9) DEFAULT NULL,
  `vl_recibo` decimal(12,2) DEFAULT NULL,
  `vl_adiant` decimal(12,2) DEFAULT NULL,
  `entidade_negocio` int(11) NOT NULL,
  `id_vendedor` mediumint(9) DEFAULT NULL,
  PRIMARY KEY (`entidade_negocio`,`num_recibo`),
  KEY `fk_ comissoes_cobrador` (`entidade_negocio`,`id_cobrador`),
  KEY `fk_comissoes_vendedor` (`entidade_negocio`,`id_vendedor`),
  CONSTRAINT `fk_ comissoes_cobrador` FOREIGN KEY (`entidade_negocio`, `id_cobrador`) REFERENCES `tb_cobradores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_comissoes_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_comissoes_vendedor` FOREIGN KEY (`entidade_negocio`, `id_vendedor`) REFERENCES `tb_vendedores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_comissoes`
--

LOCK TABLES `tb_comissoes` WRITE;
/*!40000 ALTER TABLE `tb_comissoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_comissoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_devolucoes`
--

DROP TABLE IF EXISTS `tb_devolucoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_devolucoes` (
  `id` int(11) NOT NULL,
  `id_venda` varchar(12) DEFAULT NULL,
  `id_vendedor` mediumint(9) DEFAULT NULL,
  `id_produto` mediumint(9) DEFAULT NULL,
  `dt_devolucao` date DEFAULT NULL,
  `qt_devolucao` smallint(6) DEFAULT NULL,
  `vl_uni_devo` tinyint(4) DEFAULT NULL,
  `vl_tot_devo` decimal(12,2) DEFAULT NULL,
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  `aitvo` tinyint(4) DEFAULT 0,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  KEY `fk_devol_vendas` (`entidade_negocio`,`id_venda`),
  KEY `fk_devol_vendedor` (`entidade_negocio`,`id_vendedor`),
  KEY `fl_devol_produtos` (`entidade_negocio`,`id_produto`),
  CONSTRAINT `fk_devol_vendas` FOREIGN KEY (`entidade_negocio`, `id_venda`) REFERENCES `tb_vendas` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_devol_vendedor` FOREIGN KEY (`entidade_negocio`, `id_vendedor`) REFERENCES `tb_vendedores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fl_devol_produtos` FOREIGN KEY (`entidade_negocio`, `id_produto`) REFERENCES `tb_produtos` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_devolucoes`
--

LOCK TABLES `tb_devolucoes` WRITE;
/*!40000 ALTER TABLE `tb_devolucoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_devolucoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_distribuicao`
--

DROP TABLE IF EXISTS `tb_distribuicao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_distribuicao` (
  `id` varchar(8) NOT NULL,
  `dt_distrib` date DEFAULT NULL,
  `id_vendedor` mediumint(9) DEFAULT NULL,
  `entidade_negocio` int(11) NOT NULL,
  `situacao` tinyint(4) DEFAULT 0 COMMENT '0 = ativo; 1 = encerrado',
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  KEY `entidade_negocio` (`entidade_negocio`,`id`),
  KEY `fkdistrib_vendedores` (`entidade_negocio`,`id_vendedor`),
  CONSTRAINT `fk_distrib_entidades` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fkdistrib_vendedores` FOREIGN KEY (`entidade_negocio`, `id_vendedor`) REFERENCES `tb_vendedores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_distribuicao`
--

LOCK TABLES `tb_distribuicao` WRITE;
/*!40000 ALTER TABLE `tb_distribuicao` DISABLE KEYS */;
INSERT INTO `tb_distribuicao` VALUES
('20260001','2026-04-11',1,1,0);
/*!40000 ALTER TABLE `tb_distribuicao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_entidades`
--

DROP TABLE IF EXISTS `tb_entidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_entidades` (
  `id` int(11) NOT NULL,
  `nom_entidade` varchar(150) NOT NULL,
  `nom_responsavel` varchar(150) NOT NULL,
  `num_cnpj` varchar(25) DEFAULT NULL,
  `cel_contato` varchar(20) NOT NULL,
  `com_rota_cobranca` tinyint(4) DEFAULT 0,
  `cel_whatsapp_bussiness` varchar(20) DEFAULT NULL,
  `percent_desconto_venda` decimal(6,1) DEFAULT NULL,
  `percent_desconto_cobranca` decimal(6,1) DEFAULT NULL,
  `ativo` tinyint(4) DEFAULT 0,
  `entidade_negocio` int(11) DEFAULT 999,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_entidades`
--

LOCK TABLES `tb_entidades` WRITE;
/*!40000 ALTER TABLE `tb_entidades` DISABLE KEYS */;
INSERT INTO `tb_entidades` VALUES
(1,'Crediario São Carlos','Carlos',NULL,'79998825231',1,NULL,10.0,10.0,1,999);
/*!40000 ALTER TABLE `tb_entidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_estoque`
--

DROP TABLE IF EXISTS `tb_estoque`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_estoque` (
  `id_produto` mediumint(9) NOT NULL DEFAULT 0,
  `qt_reservada` decimal(8,0) NOT NULL DEFAULT 0,
  `qt_disponivel` decimal(8,0) NOT NULL DEFAULT 0,
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`entidade_negocio`,`id_produto`),
  KEY `fk_estoque_produto` (`id_produto`,`entidade_negocio`),
  CONSTRAINT `fk_estoque_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_estoque_produto` FOREIGN KEY (`entidade_negocio`, `id_produto`) REFERENCES `tb_produtos` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_estoque`
--

LOCK TABLES `tb_estoque` WRITE;
/*!40000 ALTER TABLE `tb_estoque` DISABLE KEYS */;
INSERT INTO `tb_estoque` VALUES
(1,10,39,1),
(2,2,38,1),
(3,0,25,1);
/*!40000 ALTER TABLE `tb_estoque` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_estoque_mov`
--

DROP TABLE IF EXISTS `tb_estoque_mov`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_estoque_mov` (
  `id` int(11) NOT NULL DEFAULT 0,
  `dt_mov` date NOT NULL DEFAULT '0000-00-00',
  `id_produto` mediumint(9) DEFAULT NULL,
  `tp_mov` varchar(50) DEFAULT NULL,
  `qt_mov` mediumint(9) DEFAULT NULL,
  `nr_documento` varchar(50) NOT NULL DEFAULT '',
  `descricao` varchar(250) DEFAULT NULL,
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`entidade_negocio`,`dt_mov`,`id`) USING BTREE,
  KEY `fk_mov_produtos` (`entidade_negocio`,`id_produto`),
  CONSTRAINT `fk_mov_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_mov_produtos` FOREIGN KEY (`entidade_negocio`, `id_produto`) REFERENCES `tb_produtos` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_estoque_mov`
--

LOCK TABLES `tb_estoque_mov` WRITE;
/*!40000 ALTER TABLE `tb_estoque_mov` DISABLE KEYS */;
INSERT INTO `tb_estoque_mov` VALUES
(1,'2026-04-10',1,'ENT',50,'DOC-982151','ENTRADA DE PRODUTO NO ESTOQUE',1),
(2,'2026-04-10',3,'ENT',25,'DOC-436516','ENTRADA DE PRODUTO NO ESTOQUE',1),
(3,'2026-04-10',2,'ENT',30,'DOC-723914','ENTRADA DE PRODUTO NO ESTOQUR',1),
(1,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001',1),
(2,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(3,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(4,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(5,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(6,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(7,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(8,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(9,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(10,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(11,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(12,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(13,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(14,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(15,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(16,'2026-04-11',1,'MOVIMENTAÇÃO',10,'20260001','Exclusao Distribuicao 20260001',1),
(17,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(18,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(19,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(20,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(21,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(22,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(23,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',10,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(24,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',5,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(25,'2026-04-11',1,'VENDA',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(26,'2026-04-11',2,'VENDA',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(27,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',9,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(28,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',4,'20260001','Inserir/Atualizar itens da Distribuicao: 20260001 Vendedor : 001 CARLOS',1),
(29,'2026-04-11',1,'DISTRIBUIÇÃO DE PRODUTO',8,'20260001','Distribuicao: 20260001 Vendedor: 001 CARLOS',1),
(30,'2026-04-11',2,'DISTRIBUIÇÃO DE PRODUTO',4,'20260001','Distribuicao: 20260001 Vendedor: 001 CARLOS',1),
(1,'2026-04-12',2,'DEVOL',1,'202600100001','Devolução de produto referente a exclusão de item da venda ID 202600100001',1),
(2,'2026-04-12',2,'VENDA',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(3,'2026-04-12',1,'DISTRIBUIÇÃO DE PRODUTO',8,'20260001','Distribuicao: 20260001 Vendedor: 001 CARLOS',1),
(4,'2026-04-12',2,'DISTRIBUIÇÃO DE PRODUTO',4,'20260001','Distribuicao: 20260001 Vendedor: 001 CARLOS',1),
(5,'2026-04-12',2,'VENDA',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(6,'2026-04-12',2,'DEVOL',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(7,'2026-04-12',2,'VENDA',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(8,'2026-04-12',2,'DEVOL',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(9,'2026-04-12',2,'VENDA',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(10,'2026-04-12',2,'DEVOL',1,'202600100001','Movimentação de estoque referente a venda ID 202600100001',1),
(11,'2026-04-12',2,'DEVOL',1,'202600100001','Devolução de produto referente a exclusão de item da venda ID 202600100001',1);
/*!40000 ALTER TABLE `tb_estoque_mov` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_itens_distrib`
--

DROP TABLE IF EXISTS `tb_itens_distrib`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_itens_distrib` (
  `id_vendedor` mediumint(9) NOT NULL,
  `id_produto` mediumint(9) NOT NULL,
  `qt_distrib` smallint(6) NOT NULL,
  `id_distrib` varchar(8) DEFAULT NULL,
  `entidade_negocio` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_vendedor`,`id_produto`) USING BTREE,
  KEY `fk_itens_distrib_produtos` (`entidade_negocio`,`id_produto`),
  KEY `fk_itens_distrib_vendedores` (`entidade_negocio`,`id_vendedor`),
  KEY `fk_itens_distrib_distribuicoes` (`entidade_negocio`,`id_distrib`),
  CONSTRAINT `fk_itens_distrib_distribuicoes` FOREIGN KEY (`entidade_negocio`, `id_distrib`) REFERENCES `tb_distribuicao` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_itens_distrib_entidades` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_itens_distrib_produtos` FOREIGN KEY (`entidade_negocio`, `id_produto`) REFERENCES `tb_produtos` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_itens_distrib_vendedores` FOREIGN KEY (`entidade_negocio`, `id_vendedor`) REFERENCES `tb_vendedores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_itens_distrib`
--

LOCK TABLES `tb_itens_distrib` WRITE;
/*!40000 ALTER TABLE `tb_itens_distrib` DISABLE KEYS */;
INSERT INTO `tb_itens_distrib` VALUES
(1,1,8,'20260001',1),
(1,2,4,'20260001',1);
/*!40000 ALTER TABLE `tb_itens_distrib` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_itens_vendas`
--

DROP TABLE IF EXISTS `tb_itens_vendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_itens_vendas` (
  `id_venda` varchar(12) NOT NULL,
  `id` smallint(6) NOT NULL DEFAULT 0,
  `id_produto` mediumint(9) DEFAULT NULL,
  `forma_pagamnto` varchar(30) DEFAULT NULL,
  `qt_produto` smallint(6) DEFAULT 0,
  `vl_unit` decimal(10,2) DEFAULT NULL,
  `vl_tot_item` decimal(12,2) GENERATED ALWAYS AS (`qt_produto` * `vl_unit`) STORED,
  `entidade_negocio` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_venda`,`id`) USING BTREE,
  KEY `fk_itens_produtos` (`entidade_negocio`,`id_produto`),
  KEY `fk_itens_vendas` (`entidade_negocio`,`id_venda`),
  CONSTRAINT `fk_itens_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_itens_produtos` FOREIGN KEY (`entidade_negocio`, `id_produto`) REFERENCES `tb_produtos` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_itens_vendas` FOREIGN KEY (`entidade_negocio`, `id_venda`) REFERENCES `tb_vendas` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_itens_vendas`
--

LOCK TABLES `tb_itens_vendas` WRITE;
/*!40000 ALTER TABLE `tb_itens_vendas` DISABLE KEYS */;
INSERT INTO `tb_itens_vendas` VALUES
('202600100001',1,1,'prazo',1,95.00,95.00,1);
/*!40000 ALTER TABLE `tb_itens_vendas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_modo_acessos`
--

DROP TABLE IF EXISTS `tb_modo_acessos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_modo_acessos` (
  `modo_acesso` char(2) NOT NULL,
  `nome_modo` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`modo_acesso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_modo_acessos`
--

LOCK TABLES `tb_modo_acessos` WRITE;
/*!40000 ALTER TABLE `tb_modo_acessos` DISABLE KEYS */;
INSERT INTO `tb_modo_acessos` VALUES
('DM','Desktop e Mobile'),
('DT','Desktop'),
('MB','Mobile'),
('SF','Staff');
/*!40000 ALTER TABLE `tb_modo_acessos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_pagamentos`
--

DROP TABLE IF EXISTS `tb_pagamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_pagamentos` (
  `id` int(11) NOT NULL,
  `id_venda` varchar(12) NOT NULL,
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  `dt_pagamento` date NOT NULL,
  `id_cobrador` mediumint(9) DEFAULT NULL,
  `vl_pagamento` decimal(12,2) NOT NULL DEFAULT 0.00,
  `num_recibo` varchar(10) DEFAULT NULL,
  `vl_desconto` decimal(10,2) DEFAULT NULL,
  `vl_a_pagar` decimal(12,2) GENERATED ALWAYS AS (coalesce(`vl_pagamento`,0) - coalesce(`vl_desconto`,0)) STORED,
  PRIMARY KEY (`entidade_negocio`,`id_venda`,`id`),
  KEY `fk_pagamentos_cobrador` (`entidade_negocio`,`id_cobrador`),
  CONSTRAINT `fk_pagamentos_cobrador` FOREIGN KEY (`entidade_negocio`, `id_cobrador`) REFERENCES `tb_cobradores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_pagamentos_entidades` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_pagamentos_vendas` FOREIGN KEY (`entidade_negocio`, `id_venda`) REFERENCES `tb_vendas` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_pagamentos`
--

LOCK TABLES `tb_pagamentos` WRITE;
/*!40000 ALTER TABLE `tb_pagamentos` DISABLE KEYS */;
INSERT INTO `tb_pagamentos` VALUES
(1,'202600100001',1,'2026-04-11',1,55.00,NULL,0.00,55.00);
/*!40000 ALTER TABLE `tb_pagamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_perfis`
--

DROP TABLE IF EXISTS `tb_perfis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_perfis` (
  `id` tinyint(4) NOT NULL,
  `nom_perfil` varchar(100) NOT NULL,
  `selecionar` tinyint(4) NOT NULL DEFAULT 1,
  `atualizar` tinyint(4) NOT NULL DEFAULT 0,
  `excluir` tinyint(4) NOT NULL DEFAULT 0,
  `inserir` tinyint(4) NOT NULL DEFAULT 0,
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  CONSTRAINT `fk_perfil_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_perfis`
--

LOCK TABLES `tb_perfis` WRITE;
/*!40000 ALTER TABLE `tb_perfis` DISABLE KEYS */;
INSERT INTO `tb_perfis` VALUES
(1,'Administrador',1,1,1,1,1),
(2,'Operador',1,1,0,1,1),
(3,'Convidado',1,0,0,0,1);
/*!40000 ALTER TABLE `tb_perfis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_produtos`
--

DROP TABLE IF EXISTS `tb_produtos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_produtos` (
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  `id` mediumint(9) NOT NULL DEFAULT 0,
  `nom_produto` varchar(150) NOT NULL,
  `mar_produto` varchar(150) NOT NULL,
  `und_produto` varchar(50) NOT NULL,
  `prc_vista` decimal(10,2) NOT NULL DEFAULT 0.00,
  `prc_prazo` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estq_max` smallint(6) DEFAULT NULL,
  `estq_min` smallint(6) DEFAULT NULL,
  `ativo` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  CONSTRAINT `fk_entidade_prod` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_produtos`
--

LOCK TABLES `tb_produtos` WRITE;
/*!40000 ALTER TABLE `tb_produtos` DISABLE KEYS */;
INSERT INTO `tb_produtos` VALUES
(1,1,'PANELA GRANDE EM ALUMINIO','PANEX','UN',64.99,94.99,20,5,1),
(1,2,'COLCHA DE CASAL','SANTISTA','UN',54.99,84.99,15,5,1),
(1,3,'CARDEIRA DE BALANCO','MARCA PROPRIA','UN',144.99,199.99,10,5,1);
/*!40000 ALTER TABLE `tb_produtos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_restricao_credito`
--

DROP TABLE IF EXISTS `tb_restricao_credito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_restricao_credito` (
  `id` varchar(8) NOT NULL,
  `entidade_negocio` int(11) NOT NULL,
  `cpf_cliente` varchar(12) DEFAULT NULL,
  `dt_restricao` date DEFAULT NULL,
  `com_restricao` tinyint(4) DEFAULT 0,
  `id_venda` varchar(12) DEFAULT NULL,
  `dias_atrasado` smallint(6) DEFAULT 0,
  PRIMARY KEY (`entidade_negocio`,`id`),
  KEY `fk_restricao_clientes` (`cpf_cliente`),
  KEY `fk_restricao_vendas` (`entidade_negocio`,`id_venda`),
  CONSTRAINT `fk_restricao_clientes` FOREIGN KEY (`cpf_cliente`) REFERENCES `tb_clientes` (`cpf_cliente`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_restricao_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_restricao_vendas` FOREIGN KEY (`entidade_negocio`, `id_venda`) REFERENCES `tb_vendas` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_restricao_credito`
--

LOCK TABLES `tb_restricao_credito` WRITE;
/*!40000 ALTER TABLE `tb_restricao_credito` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_restricao_credito` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_rotas`
--

DROP TABLE IF EXISTS `tb_rotas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_rotas` (
  `id` mediumint(9) NOT NULL DEFAULT 0,
  `nom_rota` varchar(150) NOT NULL DEFAULT '',
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  `ativo` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  CONSTRAINT `fk_entidade_rota` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_rotas`
--

LOCK TABLES `tb_rotas` WRITE;
/*!40000 ALTER TABLE `tb_rotas` DISABLE KEYS */;
INSERT INTO `tb_rotas` VALUES
(1,'CIDADE ALTA',1,1);
/*!40000 ALTER TABLE `tb_rotas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_staff_user`
--

DROP TABLE IF EXISTS `tb_staff_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_staff_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(35) NOT NULL DEFAULT '',
  `password` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user` (`user`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_staff_user`
--

LOCK TABLES `tb_staff_user` WRITE;
/*!40000 ALTER TABLE `tb_staff_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_staff_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_tipos_pagamentos`
--

DROP TABLE IF EXISTS `tb_tipos_pagamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_tipos_pagamentos` (
  `id` tinyint(4) NOT NULL DEFAULT 0,
  `nom_tipo` varchar(250) NOT NULL,
  `ativo` tinyint(4) NOT NULL DEFAULT 0,
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  `dias_apos_pagamnto` smallint(6) DEFAULT NULL,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_tipos_pagamentos`
--

LOCK TABLES `tb_tipos_pagamentos` WRITE;
/*!40000 ALTER TABLE `tb_tipos_pagamentos` DISABLE KEYS */;
INSERT INTO `tb_tipos_pagamentos` VALUES
(1,'SEMANAL',1,1,7),
(2,'QUINZENAL',1,1,15),
(3,'MENSAL',1,1,30);
/*!40000 ALTER TABLE `tb_tipos_pagamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_usuarios`
--

DROP TABLE IF EXISTS `tb_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_usuarios` (
  `id` int(11) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `nom_completo` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT '',
  `senha` varchar(500) NOT NULL,
  `entidade_negocio` int(11) NOT NULL,
  `reset_password` tinyint(4) NOT NULL DEFAULT 0,
  `iniciais` varchar(5) NOT NULL,
  `id_perfil` tinyint(4) NOT NULL DEFAULT 3,
  `num_verificacao` varchar(8) DEFAULT NULL,
  `modo_acesso` char(2) DEFAULT NULL,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  UNIQUE KEY `usuario` (`entidade_negocio`,`usuario`),
  UNIQUE KEY `idx_usuario` (`usuario`) USING BTREE,
  KEY `fk_usuario_perfil` (`entidade_negocio`,`id_perfil`),
  KEY `fk_usuarios_modo_acesso` (`modo_acesso`),
  CONSTRAINT `fk_usuario_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuario_perfil` FOREIGN KEY (`entidade_negocio`, `id_perfil`) REFERENCES `tb_perfis` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuarios_modo_acesso` FOREIGN KEY (`modo_acesso`) REFERENCES `tb_modo_acessos` (`modo_acesso`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_usuarios`
--

LOCK TABLES `tb_usuarios` WRITE;
/*!40000 ALTER TABLE `tb_usuarios` DISABLE KEYS */;
INSERT INTO `tb_usuarios` VALUES
(1,'admin-001','ADMINISTRADOR','ob@gmail.com','s2$A2rhZ6gJpzkt7qUCbJ5FYw$xBWpTmQBRvHFJ1zymq1S7IbuUJSSLRmwDxnzVIhBYJ0',1,0,'AA',1,NULL,'DM'),
(2,'staff-001','ADMINISTRADOR STAFF','OBTNETO@GMAIL.COM','s2$PudYrKZJJuTUQ3L3h_eovA$Y5XMKYX_2eqBJNQTzoPomurknTowQ8ykD67pUognBzY',1,0,'SS',1,NULL,'SF'),
(3,'ovidio-staff','OVIDIO-STAFF',NULL,'s2$WT8b8_Jc28QCs-ggPYafOQ$ZP3fHdtKYoDfLE4PA0_2FvNnS1dK7MbeDHM9hWBXkMk',1,0,'OV',1,NULL,'SF');
/*!40000 ALTER TABLE `tb_usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_vendas`
--

DROP TABLE IF EXISTS `tb_vendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_vendas` (
  `id` varchar(12) NOT NULL,
  `entidade_negocio` int(11) NOT NULL,
  `dt_venda` date NOT NULL,
  `id_vendedor` mediumint(9) NOT NULL,
  `id_cobrador` mediumint(9) DEFAULT NULL,
  `id_rota` mediumint(9) DEFAULT NULL,
  `id_tipo_pag` tinyint(4) NOT NULL,
  `cpf_cliente` varchar(12) NOT NULL,
  `marca_venda` varchar(1) DEFAULT NULL,
  `num_recibo` varchar(10) DEFAULT NULL,
  `referencia` varchar(255) NOT NULL,
  `val_tot_venda` decimal(12,2) NOT NULL DEFAULT 0.00,
  `situacao` tinyint(4) NOT NULL DEFAULT 0,
  `dia_pagam` date DEFAULT NULL,
  `melhor_dia` date DEFAULT NULL,
  `val_desconto` decimal(10,2) DEFAULT NULL,
  `ult_dat_pagamto` date DEFAULT NULL,
  PRIMARY KEY (`entidade_negocio`,`id`),
  UNIQUE KEY `idx_id_venda_cpf` (`id`,`cpf_cliente`),
  KEY `fk_venda_cliente` (`cpf_cliente`),
  KEY `fk_venda_vendedores` (`entidade_negocio`,`id_vendedor`),
  KEY `fk_venda_cobradores` (`entidade_negocio`,`id_cobrador`),
  KEY `fk_venda_rotas` (`entidade_negocio`,`id_rota`),
  KEY `fk_venda_tipos_pagamentos` (`entidade_negocio`,`id_tipo_pag`),
  KEY `entidade_negocio` (`entidade_negocio`,`id`),
  CONSTRAINT `fk_venda_cliente` FOREIGN KEY (`cpf_cliente`) REFERENCES `tb_clientes` (`cpf_cliente`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_venda_cobradores` FOREIGN KEY (`entidade_negocio`, `id_cobrador`) REFERENCES `tb_cobradores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_venda_entidade` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_venda_rotas` FOREIGN KEY (`entidade_negocio`, `id_rota`) REFERENCES `tb_rotas` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_venda_tipos_pagamentos` FOREIGN KEY (`entidade_negocio`, `id_tipo_pag`) REFERENCES `tb_tipos_pagamentos` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_venda_vendedores` FOREIGN KEY (`entidade_negocio`, `id_vendedor`) REFERENCES `tb_vendedores` (`entidade_negocio`, `id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_vendas`
--

LOCK TABLES `tb_vendas` WRITE;
/*!40000 ALTER TABLE `tb_vendas` DISABLE KEYS */;
INSERT INTO `tb_vendas` VALUES
('202600100001',1,'2026-04-11',1,NULL,1,2,'50365347515',NULL,NULL,'',95.00,3,'2026-03-23',NULL,0.00,'2026-04-12');
/*!40000 ALTER TABLE `tb_vendas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_vendedores`
--

DROP TABLE IF EXISTS `tb_vendedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_vendedores` (
  `id` mediumint(9) NOT NULL DEFAULT 0,
  `nom_vendedor` varchar(150) NOT NULL DEFAULT '',
  `comissao` decimal(10,1) NOT NULL,
  `cel_contato` varchar(15) NOT NULL,
  `entidade_negocio` int(11) NOT NULL DEFAULT 0,
  `ativo` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`entidade_negocio`,`id`) USING BTREE,
  CONSTRAINT `FK_entidade_vend` FOREIGN KEY (`entidade_negocio`) REFERENCES `tb_entidades` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_vendedores`
--

LOCK TABLES `tb_vendedores` WRITE;
/*!40000 ALTER TABLE `tb_vendedores` DISABLE KEYS */;
INSERT INTO `tb_vendedores` VALUES
(1,'CARLOS',11.0,'79998152510',1,1);
/*!40000 ALTER TABLE `tb_vendedores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `vw_vendas`
--

DROP TABLE IF EXISTS `vw_vendas`;
/*!50001 DROP VIEW IF EXISTS `vw_vendas`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vw_vendas` AS SELECT
 1 AS `id`,
  1 AS `dt_venda`,
  1 AS `cpf_cliente`,
  1 AS `nom_cliente`,
  1 AS `nom_usual`,
  1 AS `end_cliente`,
  1 AS `bai_cliente`,
  1 AS `cid_cliente`,
  1 AS `uf_cliente`,
  1 AS `val_tot_venda`,
  1 AS `nom_tipo`,
  1 AS `situacao`,
  1 AS `id_vendedor`,
  1 AS `entidade_negocio`,
  1 AS `val_desconto`,
  1 AS `tot_pagamentos`,
  1 AS `tot_a_pagar` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vw_vendas_cobrancas`
--

DROP TABLE IF EXISTS `vw_vendas_cobrancas`;
/*!50001 DROP VIEW IF EXISTS `vw_vendas_cobrancas`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vw_vendas_cobrancas` AS SELECT
 1 AS `ano`,
  1 AS `mes`,
  1 AS `qtde_vendas`,
  1 AS `total_vendas`,
  1 AS `total_cobrancas`,
  1 AS `qtde_cobranças` */;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'dbcred'
--
/*!50106 SET @save_time_zone= @@TIME_ZONE */ ;
/*!50106 DROP EVENT IF EXISTS `atualizar_situacao_vendas_horario` */;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`root`@`localhost`*/ /*!50106 EVENT `atualizar_situacao_vendas_horario` ON SCHEDULE EVERY 1 HOUR STARTS '2026-03-27 12:08:15' ON COMPLETION PRESERVE ENABLE DO UPDATE tb_vendas vd 
  JOIN tb_tipos_pagamentos tp ON tp.entidade_negocio = vd.entidade_negocio 
    AND tp.id = vd.id_tipo_pag
  SET vd.situacao = CASE 
      WHEN DATEDIFF(CURRENT_DATE(),vd.dia_pagam) > (tp.dias_apos_pagamnto + 1) THEN 3 
      ELSE 0
  END WHERE vd.situacao = 0 */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
/*!50106 DROP EVENT IF EXISTS `atualizar_status_distribuicao` */;;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`root`@`localhost`*/ /*!50106 EVENT `atualizar_status_distribuicao` ON SCHEDULE EVERY 1 MINUTE STARTS '2026-03-31 15:22:48' ON COMPLETION NOT PRESERVE ENABLE DO UPDATE tb_distribuicao d
LEFT JOIN tb_itens_distrib i
    ON i.entidade_negocio = d.entidade_negocio
    AND i.id_distrib = d.id
    AND i.qt_distrib > 0
SET d.situacao = IF(i.id_distrib IS NULL, 1, 0)
WHERE d.situacao <> IF(i.id_distrib IS NULL, 1, 0) */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
/*!50106 DROP EVENT IF EXISTS `atualiza_restricao_credito` */;;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = '-03:00' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`obtneto`@`%`*/ /*!50106 EVENT `atualiza_restricao_credito` ON SCHEDULE EVERY 1 DAY STARTS '2026-04-09 17:12:48' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
                
                -- 1. Declarar o que fazer em caso de erro (SQLEXCEPTION)			
                DECLARE EXIT HANDLER FOR SQLEXCEPTION 
                BEGIN
                    ROLLBACK; -- Cancela tudo se qualquer query falhar
                END;
                
				START TRANSACTION;
										
                -- Query 1: INSERT (exemplo de log ou histórico)
                INSERT INTO tb_restricao_credito (id,cpf_cliente, dt_restricao, com_restricao,entidade_negocio,id_venda,dias_atrasado)
                SELECT NovoIdRestricao(v.entidade_negocio) ,v.cpf_cliente,CURRENT_DATE(), 1 ,v.entidade_negocio,v.id,
								TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE())
                FROM tb_vendas v
                INNER JOIN tb_clientes c ON c.cpf_cliente = v.cpf_cliente
                WHERE TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE()) > 5 AND c.com_restricao_credito = 0;

                -- Query 2: UPDATE dos clientes com restrição
                UPDATE tb_clientes c
                INNER JOIN tb_vendas v ON v.cpf_cliente = c.cpf_cliente
                SET c.com_restricao_credito = 1
                WHERE TIMESTAMPDIFF(DAY, v.dia_pagam, CURDATE()) > 5 AND c.com_restricao_credito = 0;
                
                -- 3. Se chegou aqui sem erros, confirma as alterações
                COMMIT;

            END */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
/*!50106 DROP EVENT IF EXISTS `atualiza_situacao_vendas_horario` */;;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = '-03:00' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`obtneto`@`%`*/ /*!50106 EVENT `atualiza_situacao_vendas_horario` ON SCHEDULE EVERY 1 HOUR STARTS '2026-04-09 17:12:48' ON COMPLETION NOT PRESERVE ENABLE DO UPDATE tb_vendas vd
                JOIN tb_tipos_pagamentos tp ON tp.entidade_negocio = vd.entidade_negocio AND tp.id = vd.id_tipo_pag
                SET vd.situacao = CASE
                    WHEN DATEDIFF(CURRENT_DATE(),vd.dia_pagam) > (tp.dias_apos_pagamnto + 1) THEN 3
                    ELSE 0
                END
                WHERE vd.situacao = 0 */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
/*!50106 DROP EVENT IF EXISTS `atualiza_status_distribuicao` */;;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = '-03:00' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`obtneto`@`%`*/ /*!50106 EVENT `atualiza_status_distribuicao` ON SCHEDULE EVERY 1 MINUTE STARTS '2026-04-09 17:12:48' ON COMPLETION NOT PRESERVE ENABLE DO UPDATE tb_distribuicao d
            LEFT JOIN tb_itens_distrib i
                ON i.entidade_negocio = d.entidade_negocio
                AND i.id_distrib = d.id
                AND i.qt_distrib > 0
            SET d.situacao = IF(i.id_distrib IS NULL, 1, 0)
            WHERE d.situacao <> IF(i.id_distrib IS NULL, 1, 0) */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
DELIMITER ;
/*!50106 SET TIME_ZONE= @save_time_zone */ ;

--
-- Dumping routines for database 'dbcred'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP FUNCTION IF EXISTS `NovoIdRestricao` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `NovoIdRestricao`(entidade INT) RETURNS varchar(20) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
BEGIN
  -- Adicionado ponto e vírgula após cada DECLARE
  DECLARE v_prox_id INT DEFAULT 0;
  DECLARE v_ano_atual INT DEFAULT 0;
  DECLARE v_ano_final VARCHAR(4);
  
  SELECT IFNULL(MAX(id), 0) + 1 INTO v_prox_id
  FROM tb_restricao_credito
  WHERE entidade_negocio = entidade;
  
  SELECT ano_corrente INTO v_ano_atual FROM tb_check_ano WHERE id = 1;
  
  IF (v_ano_atual < YEAR(NOW())) THEN
      SET v_prox_id = 1;
      SET v_ano_final = CAST(YEAR(NOW()) AS CHAR);
  ELSE
      SET v_ano_final = CAST(v_ano_atual AS CHAR);
  END IF;

  RETURN CONCAT(v_ano_final, LPAD(v_prox_id, 4, '0'));
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `vw_vendas`
--

/*!50001 DROP VIEW IF EXISTS `vw_vendas`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_vendas` AS select `v`.`id` AS `id`,`v`.`dt_venda` AS `dt_venda`,`v`.`cpf_cliente` AS `cpf_cliente`,`c`.`nom_cliente` AS `nom_cliente`,`c`.`nom_usual` AS `nom_usual`,`c`.`end_cliente` AS `end_cliente`,`c`.`bai_cliente` AS `bai_cliente`,`c`.`cid_cliente` AS `cid_cliente`,`c`.`uf_cliente` AS `uf_cliente`,`v`.`val_tot_venda` AS `val_tot_venda`,`tp`.`nom_tipo` AS `nom_tipo`,`v`.`situacao` AS `situacao`,`v`.`id_vendedor` AS `id_vendedor`,`v`.`entidade_negocio` AS `entidade_negocio`,`v`.`val_desconto` AS `val_desconto`,(select sum(`pg`.`vl_pagamento`) AS `tot_pagamentos` from `tb_pagamentos` `pg` where `pg`.`entidade_negocio` = `v`.`entidade_negocio` and `pg`.`id_venda` = `v`.`id`) AS `tot_pagamentos`,`v`.`val_tot_venda` - `v`.`val_desconto` - (select sum(`pg`.`vl_pagamento`) AS `tot_pagamentos` from `tb_pagamentos` `pg` where `pg`.`entidade_negocio` = `v`.`entidade_negocio` and `pg`.`id_venda` = `v`.`id`) AS `tot_a_pagar` from ((`tb_vendas` `v` left join `tb_clientes` `c` on(`c`.`cpf_cliente` = `v`.`cpf_cliente`)) left join `tb_tipos_pagamentos` `tp` on(`tp`.`id` = `v`.`id_tipo_pag` and `tp`.`entidade_negocio` = `v`.`entidade_negocio`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_vendas_cobrancas`
--

/*!50001 DROP VIEW IF EXISTS `vw_vendas_cobrancas`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_vendas_cobrancas` AS select year(`vd`.`dt_venda`) AS `ano`,month(`vd`.`dt_venda`) AS `mes`,count(`vd`.`id`) AS `qtde_vendas`,sum(`vd`.`val_tot_venda`) AS `total_vendas`,ifnull(sum(`pg`.`total_pg`),0) AS `total_cobrancas`,ifnull(sum(`pg`.`contagem_pg`),0) AS `qtde_cobranças` from (`tb_vendas` `vd` left join (select `tb_pagamentos`.`id_venda` AS `id_venda`,`tb_pagamentos`.`entidade_negocio` AS `entidade_negocio`,count(0) AS `contagem_pg`,sum(`tb_pagamentos`.`vl_pagamento`) AS `total_pg` from `tb_pagamentos` group by `tb_pagamentos`.`entidade_negocio`,`tb_pagamentos`.`id_venda`) `pg` on(`pg`.`id_venda` = `vd`.`id` and `pg`.`entidade_negocio` = `vd`.`entidade_negocio`)) group by year(`vd`.`dt_venda`),month(`vd`.`dt_venda`) order by year(`vd`.`dt_venda`),month(`vd`.`dt_venda`) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-13 19:59:43
