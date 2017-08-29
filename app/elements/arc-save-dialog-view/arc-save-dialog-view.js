(function() {
Polymer({
  is: 'arc-save-dialog-view',
  behaviors: [
    Polymer.IronOverlayBehavior,
    Polymer.IronResizableBehavior
  ],
  hostAttributes: {
    'role': 'dialog',
    'tabindex': '-1'
  },
  properties: {
    name: String,
    /**
     * True when overriding previous request
     */
    isOverride: {
      type: Boolean,
      value: false
    },
    /**
     * True when saving request to Google Drive.
     */
    isDrive: {
      type: Boolean,
      value: false
    },
    /**
     * True when the request has been or will be attached to the project.
     */
    isProject: {
      type: Boolean,
      value: false
    },
    /**
     * New project name
     */
    newProjectName: {
      type: String,
      value: ''
    },
    /**
     * Existing project ID.
     */
    projectId: {
      type: Number
    },
    /**
     * List of available projects
     */
    projects: Array
  },
  listeners: {
    'iron-overlay-opened': '_updateProjects'
  },
  /**
   * Resets the UI.
   */
  reset: function() {
    this.isOverride = false;
    this.isDrive = false;
    this.name = '';
    this.isProject = false;
    this.projectId = undefined;
    this.newProjectName = '';
    this.set('projects', []);
  },

  _cancel: function() {
    this.close();
  },

  _save: function() {
    this._fireSave(false);
  },

  _override: function() {
    this._fireSave(true);
  },

  _fireSave: function(override) {
    if (!this.name) {
      StatusNotification.notify({
        message: 'Enter name'
      });
      return;
    }
    if (this.isProject && (!this.newProjectName && !this.projectId)) {
      StatusNotification.notify({
        message: 'Enter project name or select it from projects list'
      });
      return;
    }

    this._saveRequested({
      name: this.name,
      override: override,
      isDrive: this.isDrive,
      isProject: this.isProject,
      projectName: this.newProjectName,
      projectId: this.newProjectName ? null : this.projectId
    });
  },

  _saveRequested: function(details) {
    this.fire('save-request', details);
    this.close();
  },

  _updateProjects: function() {
    this._queryProjects();
  },

  _queryProjects: function() {
    let e = this.fire('project-model-query', {});
    if (!e.detail.result) {
      this.fire('app-log', {
        message: ['error query project for save dialog', e.detail.message]
      });
      return;
    }

    e.detail.result
    .then((result) => {
      result.sort((a, b) => {
        if (a.order === b.order) {
          return 0;
        }
        if (a.order > b.order) {
          return 1;
        }
        if (a.order < b.order) {
          return -1;
        }
      });
      result = result.map((i) => {
        i.id = i._id;
        return i;
      });
      this.set('projects', result);
    })
    .catch((err) => {
      this.fire('send-analytics', {
        type: 'exception',
        description: 'save-dialog-view:' + err.message,
        fatal: false
      });
      this.fire('app-log', {'message': err, 'level': 'error'});
    });
  },

  _projectsRead: function(e) {
    this.set('projects', e.detail.data);
  },

  _computeShowProjectSelector: function(projects, newProjectName) {
    if (newProjectName) {
      return false;
    }
    if (projects && projects.length) {
      return true;
    }
    return false;
  }
});
})();
