    CREATE TABLE IF NOT EXISTS gn_monitoring.t_module_complements (
        
        id_module SERIAL NOT NULL,
        uuid_module_complement UUID DEFAULT uuid_generate_v4() NOT NULL,
        
        id_list_observer INTEGER,
        id_list_taxonomy INTEGER,
        b_synthese BOOLEAN DEFAULT TRUE,
        taxonomie_display_field_name CHARACTER VARYING DEFAULT 'nom_vern,lb_nom', 

        meta_create_date timestamp without time zone NOT NULL,
        meta_update_date timestamp without time zone,

        CONSTRAINT pk_t_module_complements PRIMARY KEY (id_module),
        CONSTRAINT fk_t_module_complements_id_module FOREIGN KEY (id_module)
            REFERENCES gn_commons.t_modules (id_module) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_t_module_complements_id_list_observer FOREIGN KEY (id_list_observer)
            REFERENCES utilisateurs.t_listes (id_liste) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_t_module_complements_id_list_taxonomy FOREIGN KEY (id_list_taxonomy)
            REFERENCES taxonomie.bib_listes (id_liste) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE
    );

    CREATE TRIGGER tri_meta_dates_change_t_medias
          BEFORE INSERT OR UPDATE
          ON gn_monitoring.t_module_complements
          FOR EACH ROW
          EXECUTE PROCEDURE public.fct_trg_meta_dates_change();

    CREATE TABLE IF NOT EXISTS gn_monitoring.t_site_complements (

        id_base_site INTEGER NOT NULL,
        id_module INTEGER NOT NULL,
        id_group_site INTEGER,
        data JSONB,

        CONSTRAINT pk_t_site_complements PRIMARY KEY (id_base_site),
        CONSTRAINT fk_t_site_complements_id_module FOREIGN KEY (id_module)
            REFERENCES gn_commons.t_modules (id_module) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_t_site_complement_id_base_site FOREIGN KEY (id_base_site)
            REFERENCES gn_monitoring.t_base_sites (id_base_site) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_t_site_complement_id_group_site FOREIGN KEY (id_group_site)
            REFERENCES gn_monitoring.t_group_sites (id_group_site) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE SET NULL -- on ne supprime pas forcement les sites quand on supprime un groupe ??

    );

    CREATE TABLE IF NOT EXISTS gn_monitoring.t_visit_complements (

        id_base_visit INTEGER NOT NULL,
        data JSONB,

        CONSTRAINT pk_t_visit_complements PRIMARY KEY (id_base_visit),
        CONSTRAINT fk_t_visit_complements_id_base_visit FOREIGN KEY (id_base_visit)
            REFERENCES gn_monitoring.t_base_visits (id_base_visit) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE
    );


    CREATE TABLE IF NOT EXISTS gn_monitoring.t_observations (
        id_observation SERIAL NOT NULL,
        id_base_visit INTEGER NOT NULL,
        cd_nom INTEGER NOT NULL,
        comments TEXT,
        uuid_observation UUID DEFAULT uuid_generate_v4() NOT NULL,


        CONSTRAINT pk_t_observations PRIMARY KEY (id_observation),
        CONSTRAINT fk_t_observations_id_base_visit FOREIGN KEY (id_base_visit)
            REFERENCES gn_monitoring.t_base_visits (id_base_visit) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE
    );


    -- champs en complément de t_observation: relation 1-1

    CREATE TABLE IF NOT EXISTS gn_monitoring.t_observation_complements (
        
        id_observation INTEGER NOT NULL,
        data JSONB,

        CONSTRAINT pk_t_observation_complements PRIMARY KEY (id_observation),
        CONSTRAINT fk_t_observation_complements_id_observation FOREIGN KEY (id_observation)
            REFERENCES gn_monitoring.t_observations (id_observation) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE
    );

    -- table fille de t_observation relation 1-n

    CREATE TABLE IF NOT EXISTS gn_monitoring.t_observation_details (

        id_observation_detail SERIAL NOT NULL,
        id_observation INTEGER NOT NULL,
        data JSONB,

        CONSTRAINT pk_t_observation_details PRIMARY KEY (id_observation),
        CONSTRAINT fk_t_observation_details_id_observation FOREIGN KEY (id_observation)
            REFERENCES gn_monitoring.t_observations (id_observation) MATCH SIMPLE
            ON UPDATE CASCADE ON DELETE CASCADE
    );


-- patch en attendant que la contrainte soit dans GN
ALTER TABLE gn_commons.bib_tables_location DROP CONSTRAINT IF EXISTS unique_bib_table_location_schema_name_table_name;
ALTER TABLE gn_commons.bib_tables_location ADD CONSTRAINT unique_bib_table_location_schema_name_table_name UNIQUE (schema_name, table_name);


-- pour ne pas remettre des lignes qui existent déjà
INSERT INTO gn_commons.bib_tables_location(table_desc, schema_name, table_name, pk_field, uuid_field_name)
VALUES
('Table centralisant les modules faisant l''objet de protocole de suivis', 'gn_monitoring', 't_module_complements', 'id_module', 'uuid_module_complement'),
('Table centralisant les observations réalisées lors d''une visite sur un site', 'gn_monitoring', 't_observations', 'id_observation', 'uuid_observation'),
('Table centralisant les sites faisant l''objet de protocole de suivis', 'gn_monitoring', 't_base_sites', 'id_base_site', 'uuid_base_site'),
('Table centralisant les groupes de sites faisant l''objet de protocole de suivis', 'gn_monitoring', 't_group_sites', 'id_group_site', 'uuid_group_site'),
('Table centralisant les visites réalisées sur un site', 'gn_monitoring', 't_base_visits', 'id_base_visit', 'uuid_base_visit')
-- on evite de mettre 2 fois le meme couple (shema_name, table_name)
ON CONFLICT(schema_name, table_name) DO NOTHING;


-- Les groupes de site

CREATE TABLE IF NOT EXISTS gn_monitoring.t_group_sites (
    id_group_site SERIAL NOT NULL,

    id_module INTEGER NOT NULL,
    group_site_name character varying(255),
    group_site_code character varying(255),
    group_site_description TEXT,
    uuid_group_site UUID DEFAULT uuid_generate_v4() NOT NULL,
    comment TEXT,
    data JSONB,
    meta_create_date timestamp without time zone DEFAULT now(),
    meta_update_date timestamp without time zone DEFAULT now(),

    CONSTRAINT pk_t_group_sites PRIMARY KEY (id_group_site),
    CONSTRAINT fk_t_group_sites_id_module FOREIGN KEY (id_module)
        REFERENCES gn_commons.t_modules (id_module) MATCH SIMPLE
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TRIGGER tri_meta_dates_change_t_group_sites
    BEFORE INSERT OR UPDATE
    ON gn_monitoring.t_group_sites
    FOR EACH ROW
    EXECUTE PROCEDURE public.fct_trg_meta_dates_change();