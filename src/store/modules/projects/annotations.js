import Vue from 'vue';
import idx from 'idx';

import {
  createAnnotations,
  deleteAnnotations,
  getAnnotations,
  getRevision,
  rollbackRevision,
  setAnnotations,
} from '@/service';
import { dateFormatYYYYMMDDHHmmss } from '@/utils/dateHelper';
import { getLanguage } from '@/utils/i18n';

// 計畫標注資訊，全放在 project 會過大

const state = {
  query: {}, // 暫存最後一次的 annotations query，讓還原版本之後可以再次取值
  queryCameraLocations: [],
  annotations: [],
  annotationsTotal: 0,
  revision: [],
  requestProcessingCount: 0,
};

const getters = {
  annotations: state =>
    state.annotations.map(v => ({
      ...v,
      species: {
        ...v.species,
        title: idx(v, _ => _.species.title[getLanguage()]),
      },
    })),
  revision: state =>
    state.revision.map(v => ({
      id: v.id,
      name: v.user.name,
      isCurrent: v.isCurrent,
      createTime: dateFormatYYYYMMDDHHmmss(v.createTime),
    })),
  queryCameraLocations: state => state.queryCameraLocations,
};

const mutations = {
  plusRequestProcessing(state) {
    state.requestProcessingCount++;
  },
  minusRequestProcessing(state) {
    state.requestProcessingCount--;
  },
  saveQuery(state, query) {
    state.query = query;
  },
  setQueryCameraLocations(state, payload) {
    state.queryCameraLocations = payload;
  },
  resetAnnotations(state) {
    state.annotations = [];
    state.annotationsTotal = 0;
  },
  setAnnotations(state, payload) {
    state.annotations = idx(payload, _ => _.items) || [];
    state.annotationsTotal = idx(payload, _ => _.total);
  },
  updateAnnotations(state, annotation) {
    const idx = state.annotations.findIndex(v => v.id === annotation.id);
    Vue.set(state.annotations, idx, annotation);
  },
  deleteAnnotations(state, annotationIds) {
    state.annotations = state.annotations.filter(
      ({ id }) => !annotationIds.includes(id),
    );
    state.annotationsTotal -= 1;
  },
  setRevision(state, payload) {
    state.revision = payload;
  },
};

const actions = {
  async getAnnotations({ commit }, query) {
    const data = await getAnnotations(query);
    commit('setAnnotations', data);
    commit('saveQuery', query);
  },
  async setAnnotations({ commit }, { annotationId, body }) {
    //console.log(body);
    commit('plusRequestProcessing');
    // const data = await setAnnotations(annotationId, body);
    // commit('updateAnnotations', data);

    // workaround 之後格式修改後拿掉
    try {
      /*
      if (body.changeTime) {
        body.fields[2].value = body.changeTime;
      }*/
      let data = await setAnnotations(annotationId, body);
      data.fields = body.fields.map(v => ({
        dataField: v.dataField.id,
        value: v.value,
      }));
      console.log(data);
      commit('updateAnnotations', data);
    } catch (error) {
      console.log(error);
    }
    commit('minusRequestProcessing');
  },
  async deleteAnnotations({ commit }, ids) {
    commit('plusRequestProcessing');
    await Promise.all(ids.map(id => deleteAnnotations(id)));
    commit('deleteAnnotations', ids);
    commit('minusRequestProcessing');
  },
  async cloneAnnotations({ state, getters, commit, dispatch }, annotationIdx) {
    commit('plusRequestProcessing');
    const annotation = getters.annotations[annotationIdx];
    console.log(annotation);
    const payload = {
      cameraLocation: annotation.cameraLocation,
      filename: annotation.filename,
      file: idx(annotation, _ => _.file.id),
      time: annotation.time,
      speciesTitle: annotation.species.title,
      //changeTime: annotation.time,
      //fields: annotation.fields.filter(v => !!v.value),
      fields: [],
    };
    await createAnnotations(payload);
    dispatch('getAnnotations', state.query);
    commit('minusRequestProcessing');
  },
  async getRevision({ commit }, annotationId) {
    const data = await getRevision(annotationId);
    commit('setRevision', idx(data, _ => _.items) || []);
  },
  async rollbackRevision({ state, dispatch }, { annotationId, revisionId }) {
    await rollbackRevision(annotationId, revisionId);

    dispatch('getRevision', annotationId);
    dispatch('getAnnotations', state.query); // todo 目前是整個重新 query，之後需改成用新 api 只更新指定 annotation
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};

/*
https://github.com/TaiBIF/camera-trap-api/wiki/API-v1-Document#get-projectsprojectidannotations
https://github.com/TaiBIF/camera-trap-api/wiki/API-v1-Document#put-projectsprojectidannotationsannotationid
https://github.com/TaiBIF/camera-trap-api/wiki/API-v1-Document#get-annotations

*/
