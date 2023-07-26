import { Component, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, iif, of } from 'rxjs';
import { exhaustMap, map, mergeMap, take, tap } from 'rxjs/operators';

import { MonitoringGeomComponent } from '../../class/monitoring-geom-component';
import { IDataTableObj, ISite, ISiteField, ISiteType } from '../../interfaces/geom';
import { IPage, IPaginated } from '../../interfaces/page';
import { IVisit } from '../../interfaces/visit';
import { SitesGroupService, SitesService, VisitsService } from '../../services/api-geom.service';
import { GeoJSONService } from '../../services/geojson.service';
import { ObjectService } from '../../services/object.service';
import { JsonData } from '../../types/jsondata';
import { IBreadCrumb, SelectObject } from '../../interfaces/object';
import { Module } from '../../interfaces/module';
import { ConfigService } from '../../services/config.service';
import { FormService } from "../../services/form.service";
import { breadCrumbElementBase } from '../breadcrumbs/breadcrumbs.component';
import { ConfigJsonService } from '../../services/config-json.service';
@Component({
  selector: 'monitoring-visits',
  templateUrl: './monitoring-visits.component.html',
  styleUrls: ['./monitoring-visits.component.css'],
})
export class MonitoringVisitsComponent extends MonitoringGeomComponent implements OnInit {
  
  
  @Input() visits: IVisit[];
  @Input() page: IPage;
  // colsname: typeof columnNameVisit = columnNameVisit;
  @Input() bEdit: boolean;
  form: FormGroup;
  colsname: {};
  objParent: any;
  modules: SelectObject[];
  site: ISite;

  isInitialValues: boolean;
  paramToFilt: string = 'label';
  funcToFilt: Function;
  funcInitValues: Function;
  titleBtn: string = 'Choix des types de sites';
  placeholderText: string = 'Sélectionnez les types de site';
  id_sites_group: number;
  types_site: string[];
  config: JsonData;
  siteGroupIdParent: number;
  breadCrumbParent: IBreadCrumb = { label: 'Groupe de site', description: '' };
  breadCrumbChild: IBreadCrumb = { label: 'Site', description: '' };
  breadCrumbElementBase: IBreadCrumb = breadCrumbElementBase;
  breadCrumbList: IBreadCrumb[] = [];
  objSelected:ISiteField; 


  rows;
  dataTableObj: IDataTableObj;
  dataTableArray: {}[] = [];


  constructor(
    private _sitesGroupService: SitesGroupService,
    private _visits_service: VisitsService,
    private _objService: ObjectService,
    public geojsonService: GeoJSONService,
    private router: Router,
    private _Activatedroute: ActivatedRoute,
    private _formBuilder: FormBuilder,
    private _formService: FormService,
    private _configService: ConfigService,
    public siteService: SitesService,
    protected _configJsonService: ConfigJsonService
  ) {
    super();
    this.getAllItemsCallback = this.getVisits;
  }

  ngOnInit() {
    this.funcInitValues = this.initValueToSend.bind(this);
    this.funcToFilt = this.partialfuncToFilt.bind(this);
    this.form = this._formBuilder.group({});
    this._objService.changeObjectTypeParent(this.siteService.objectObs);
    this._objService.changeObjectType(this._visits_service.objectObs);

    this.siteGroupIdParent = parseInt(
      this._Activatedroute.pathFromRoot[this._Activatedroute.pathFromRoot.length - 2].snapshot
        .params['id']
    );
    this.initSiteVisit();
  }

  initSiteVisit() {
    this._Activatedroute.params
      .pipe(
        map((params) => params['id'] as number),
        mergeMap((id: number) =>
          { return forkJoin({
            site: this.siteService.getById(id).catch((err) => 
            {if(err.status == 404)
              { 
                this.router.navigate(['/not-found'],{ skipLocationChange: true });
              return of(null);
            }}),
            visits: this._visits_service.get(1, this.limit, {
              id_base_site: id,
            }),
          }).pipe(map((data)=> {return data}))
        }),
        exhaustMap((data)=>{
          return forkJoin({
            objObsSite: this.siteService.initConfig(),
            objObsVisit: this._visits_service.initConfig(),
          }).pipe(tap((objConfig)=> this.objParent = objConfig.objObsSite) , map((objConfig)=>{
            return {data, objConfig: objConfig}
          }))
        }),
        mergeMap(({data, objConfig}) => {
          return this._objService.currentObjSelected.pipe(
            take(1),
            map((objSelectParent:any) => {
              return {site: data.site, visits: data.visits, parentObjSelected: objSelectParent, objConfig:objConfig };
            })
          );
        }),
        mergeMap((data) => {
          return iif(
            () => data.parentObjSelected == this.siteGroupIdParent,
            of(data),
            this._sitesGroupService.getById(this.siteGroupIdParent).pipe(
              map((objSelectParent) => {
                return {site: data.site, visits: data.visits, parentObjSelected: objSelectParent, objConfig:data.objConfig };
              })
            )
          );
        })
      )
      .subscribe((data) => {
        this._objService.changeSelectedObj(data.site, true);
        this.site = data.site;
        this.types_site = data.site['types_site'];
        this.visits = data.visits.items;
        this.page = {
          page: data.visits.page - 1,
          count: data.visits.count,
          limit: data.visits.limit,
        };
        this.baseFilters = { id_base_site: this.site.id_base_site };
        this.colsname = data.objConfig.objObsVisit.dataTable.colNameObj;
        this.site['id_sites_group'] = this.siteGroupIdParent; 
        this.objSelected = this.siteService.format_label_types_site([this.site])[0]
        this.addSpecificConfig()

        const { parentObjSelected,objConfig, ...dataonlyObjConfigAndObj} = data
        dataonlyObjConfigAndObj
        dataonlyObjConfigAndObj.site["objConfig"] = objConfig.objObsSite
        dataonlyObjConfigAndObj.visits["objConfig"] = objConfig.objObsVisit
        this.setDataTableObj(dataonlyObjConfigAndObj)
        this.updateBreadCrumb(data.site, data.parentObjSelected);
      });
    this.isInitialValues = true;
  }

  getVisits(page: number, filters: JsonData) {
    this._visits_service
      .get(page, this.limit, filters)
      .subscribe((visits: IPaginated<IVisit>) => this.setVisits(visits));
  }

  setVisits(visits) {
    this.rows  = visits.items
    this.dataTableObj.visit.rows = this.rows ;
    this.dataTableObj.visit.page.count = visits.count
    this.dataTableObj.visit.page.limit = visits.limit
    this.dataTableObj.visit.page.page = visits.page - 1
  }

  seeDetails($event) {
    this.router.navigate([
      `monitorings/object/${$event.module.module_code}/visit/${$event.id_base_visit}`,
    ]);
  }

  getModules() {
    this.siteService.getSiteModules(this.site.id_base_site).subscribe(
      (data: Module[]) =>
        (this.modules = data.map((item) => {
          return { id: item.module_code, label: item.module_label };
        }))
    );
  }

  addNewVisit($event: SelectObject) {
    const moduleCode = $event.id;
    //create_object/cheveches_sites_group/visit?id_base_site=47
    this._configService.init(moduleCode).subscribe(() => {
      const keys = Object.keys(this._configService.config()[moduleCode]);
      const parent_paths = ['sites_group', 'site'].filter((item) => keys.includes(item));
      this.router.navigate([`monitorings/create_object/${moduleCode}/visit`], {
        queryParams: { id_base_site: this.site.id_base_site, parents_path: parent_paths },
      });
    });
  }
  partialfuncToFilt(
    pageNumber: number,
    limit: number,
    valueToFilter: string
  ): Observable<IPaginated<ISiteType>> {
    return this.siteService.getTypeSites(pageNumber, limit, {
      label_fr: valueToFilter,
      sort_dir: 'desc',
    });
  }

  onSendConfig(config: JsonData): void {
    this.config = this.addTypeSiteListIds(config);
    this.updateForm();
    }

  addTypeSiteListIds(config: JsonData): JsonData {
    if (config && config.length != 0) {
      config.types_site = [];
      for (const key in config) {
        if ('id_nomenclature_type_site' in config[key]) {
          config.types_site.push(config[key]['id_nomenclature_type_site']);
        }
      }
    }
    return config;
  }

  addSpecificConfig(){
    // const schemaSpecificType = Object.assign({},...this.types_site)
    let schemaSpecificType = {}
    let schemaTypeMerged = {}
    let keyHtmlToPop = ''
    for (let type_site of this.types_site){
      
      if('specific' in type_site['config']) {
        for (const prop in type_site['config']['specific']){
          if('type_widget' in type_site['config']['specific'][prop] && type_site['config']['specific'][prop]['type_widget'] == "html"){
            keyHtmlToPop = prop
          }
        }
        const {[keyHtmlToPop]:_, ...specificObjWithoutHtml} = type_site['config']['specific']
        Object.assign(schemaSpecificType, specificObjWithoutHtml)
        Object.assign(schemaTypeMerged,type_site['config'] )
      }
    }


    const fieldNames = this._configJsonService.fieldNames('generic','site','display_properties',schemaTypeMerged)
    const fieldNamesList = this._configJsonService.fieldNames('generic','site','display_list',schemaTypeMerged)
    const fieldLabels = this._configJsonService.fieldLabels(schemaSpecificType);
    const fieldDefinitions = this._configJsonService.fieldDefinitions(schemaSpecificType);
    this.objParent["template_specific"] ={}
    this.objParent["template_specific"]['fieldNames'] = fieldNames;
    this.objParent["template_specific"]['fieldNamesList'] = fieldNamesList;
    this.objParent["template_specific"]['schema']= schemaSpecificType;
    this.objParent["template_specific"]['fieldLabels'] = fieldLabels;
    this.objParent["template_specific"]['fieldDefinitions'] = fieldDefinitions;
    this.objParent["template_specific"]['fieldNamesList'] = fieldNamesList;
    
  }

  initValueToSend() {
    this.initSiteVisit();
    return this.types_site;
  }

  updateForm() {
    this.site.specific = {};
    this.site.dataComplement = {};
    for (const key in this.config) {
      if (this.config[key].config != undefined) {
        if (Object.keys(this.config[key].config).length !== 0) {
          Object.assign(this.site.specific, this.config[key].config.specific);
        }
      }
    }
    const specificData = {}
    for (const k in this.site.data) this.site[k] = this.site.data[k];
    for (const k in this.site.data)  specificData[k]= this.site.data[k];
    this.site.types_site = this.config.types_site;
    Object.assign(this.site.dataComplement, this.config);
    this._formService.updateSpecificForm(this.site,specificData)
  }

  updateBreadCrumb(site, parentSelected) {
    this.breadCrumbParent.description = parentSelected.sites_group_name;
    this.breadCrumbParent.label = 'Groupe de site';
    this.breadCrumbParent['id'] = parentSelected.id_sites_group;
    this.breadCrumbParent['objectType'] =
      this._sitesGroupService.objectObs.objectType || 'sites_group';
    this.breadCrumbParent['url'] = [
      this.breadCrumbElementBase.url,
      this.breadCrumbParent.id?.toString(),
    ].join('/');

    this.breadCrumbChild.description = site.base_site_name;
    this.breadCrumbChild.label = 'Site';
    this.breadCrumbChild['id'] = site.id_base_site;
    this.breadCrumbChild['objectType'] = this.siteService.objectObs.objectType || 'site';
    this.breadCrumbChild['url'] = [
      this.breadCrumbElementBase.url,
      this.breadCrumbParent.id?.toString(),
      this.breadCrumbChild.objectType,
      this.breadCrumbChild.id?.toString(),
    ].join('/');

    this.breadCrumbList = [this.breadCrumbElementBase, this.breadCrumbParent, this.breadCrumbChild];
    this._objService.changeBreadCrumb(this.breadCrumbList, true);
  }

  onObjChanged($event) {
    if($event == 'deleted'){
      return
    }
    this.initSiteVisit();
  }

  setDataTableObj(data){
    const objTemp = {}
    for (const dataType in data){
      let objType = data[dataType].objConfig.objectType
      if(objType != "visit"){
        continue
      }
      Object.assign(objType,objTemp)
      objTemp[objType] = {columns:{},rows:[],page : {}}
      let config = this._configJsonService.configModuleObject(
        data[dataType].objConfig.moduleCode,
        data[dataType].objConfig.objectType
      );
      data[dataType].objConfig['config'] =config
      this.dataTableArray.push(data[dataType].objConfig)
    }

    for (const dataType in data){
      let objType = data[dataType].objConfig.objectType
      if(objType != "visit"){
        continue
      }
      objTemp[objType].columns =  data[dataType].objConfig.dataTable.colNameObj
      objTemp[objType].rows = data[dataType].items

      objTemp[objType].page ={
        count: data[dataType].count,
        limit: data[dataType].limit,
        page: data[dataType].page - 1,
        total: data[dataType].count,
      }

      this.dataTableObj = objTemp as IDataTableObj
    }
  }

}
