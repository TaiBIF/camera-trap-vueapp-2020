import { getProjectCameras } from '@/service';
import idx from 'idx';

const state = {
  projectCameras: [],
};

const mutations = {
  setProjectCameras(state, payload) {
    state.projectCameras = payload;
  },
};

const actions = {
  async getProjectCameras({ commit }, { projectId }) {
    const data = await getProjectCameras(projectId);
    commit('setProjectCameras', idx(data, _ => _.items) || []);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
