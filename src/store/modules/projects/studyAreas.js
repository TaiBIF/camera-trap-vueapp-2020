import idx from 'idx';
import produce from 'immer';
import * as R from 'ramda';

import {
  deleteProjectCameraLocations,
  getAllProjectCameraLocations,
  getProjectCameraLocations,
  getProjectStudyAreas,
  lockProjectCameraLocations,
  postProjectCameraLocations,
  postProjectStudyAreas,
  putProjectCameraLocations,
  unlockProjectCameraLocations,
} from '@/service';
import { getLanguage } from '@/utils/i18n';

// 計畫內的樣區資訊，全放在 project 會過大

const state = {
  studyAreas: [], // 計畫樣區列表
  cameraLocations: [], // 指定樣區內的相機位置列表，只保存最後一次的查詢結果
};

const getters = {
  studyAreas: state =>
    produce(JSON.parse(JSON.stringify(state.studyAreas)), draft =>
      draft.forEach(d => {
        d.title = d.title[getLanguage()];
        d.children.forEach(v => (v.title = v.title[getLanguage()]));
        const { latitude, longitude } =
          d.cameraLocation || idx(d, _ => _.children[0].cameraLocation) || {};
        d.position = {
          lat: latitude,
          lng: longitude,
        };
      }),
    ),
  cameraLocations: state => state.cameraLocations,
  studyAreaTitle: (_, getters) => id => {
    let title = '';
    getters.studyAreas.forEach(v => {
      // study area 第一層
      if (v.id === id) {
        title = v.title;
      } else if (v.children.length > 0) {
        v.children.forEach(v2 => {
          // study area 第二層
          if (v2.id === id) {
            title = `${v.title} - ${v2.title}`;
          }
        });
      }
    });
    return title;
  },
  cameraLocationsTitle: (_, getters) => id => {
    return R.pipe(
      R.find(R.propEq('id', id)),
      R.ifElse(R.isNil, R.always(''), v => v.name),
    )(getters.cameraLocations);
  },
};

const mutations = {
  setStudyAreas(state, payload) {
    state.studyAreas = payload;
  },
  setCameraLocations(state, payload) {
    state.cameraLocations = payload;
  },
  resetCameraLocations(state) {
    state.cameraLocations = [];
  },
};

const actions = {
  async getProjectStudyAreas({ commit }, id) {
    const data = await getProjectStudyAreas(id);
    commit('setStudyAreas', data);
  },
  async postProjectStudyAreas({ dispatch }, { id, area }) {
    const body = {
      ...area,
      title: {
        [getLanguage()]: area.title,
      },
    };
    await postProjectStudyAreas(id, body);
    dispatch('getProjectStudyAreas', id);
  },
  async getProjectCameraLocations({ commit }, { projectId, studyAreaId }) {
    const data = await getProjectCameraLocations(projectId, studyAreaId);
    commit('setCameraLocations', idx(data, _ => _.items) || []);
  },
  async getAllProjectCameraLocations(
    { commit },
    { projectId, studyAreaId, query },
  ) {
    const data = await getAllProjectCameraLocations(
      projectId,
      studyAreaId,
      query,
    );
    commit('setCameraLocations', idx(data, _ => _.items) || []);
  },
  async modifyProjectCameraLocations(
    { state, dispatch },
    { projectId, studyAreaId, payload },
  ) {
    const post = payload.filter(v => v.id === undefined); // 沒有 id 表示新增
    const put = R.innerJoin(
      (record, v) => record.id === v.id && R.equals(record, v) === false, // id 相同，並且內容不相同的
      payload,
      state.cameraLocations,
    );
    const del = R.differenceWith(
      (a, b) => a.id === b.id,
      state.cameraLocations,
      payload,
    );

    await Promise.all([
      ...post.map(v => postProjectCameraLocations(projectId, v.studyArea, v)),
      ...put.map(v => putProjectCameraLocations(projectId, v.id, v)),
      ...del.map(v => deleteProjectCameraLocations(projectId, v.id)),
    ]);
    dispatch('getProjectCameraLocations', { projectId, studyAreaId });
  },
  async setLockProjectCameraLocations(
    { dispatch },
    { projectId, studyAreaId, cameraLocations, isLock },
  ) {
    await Promise.all(
      cameraLocations.map(id =>
        isLock
          ? lockProjectCameraLocations(projectId, id)
          : unlockProjectCameraLocations(projectId, id),
      ),
    );
    dispatch('getProjectCameraLocations', { projectId, studyAreaId });
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
https://github.com/TaiBIF/camera-trap-api/wiki/API-v1-Document#post-projectsprojectidstudy-areasstudyAreaIdcamera-locations

*/
