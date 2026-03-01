CREATE TABLE `tb_itens_vendas` (
  `entidade_negocio` INT NOT NULL DEFAULT 0,
  `id_produto` MEDIUMINT NOT NULL DEFAULT 0,
  `id` SMALLINT NOT NULL DEFAULT 0,
  `qt_produto` SMALLINT NOT NULL DEFAULT 0,
  `id_venda` VARCHAR(11) NULL DEFAULT NULL,
  PRIMARY KEY (`entidade_negocio`, `id_produto`, `id`),
  CONSTRAINT `fk_itens_vendas`
    FOREIGN KEY (`entidade_negocio`, `id_venda`)
    REFERENCES `tb_vendas` (`entidade_negocio`, `id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_itens_produtos`
    FOREIGN KEY (`entidade_negocio`, `id_produto`)
    REFERENCES `tb_produtos` (`entidade_negocio`, `id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

CREATE INDEX `idx_tb_itens_vendas_fk_vendas`
ON `tb_itens_vendas` (`entidade_negocio`, `id_venda`);
