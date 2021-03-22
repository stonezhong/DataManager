import React from 'react'

import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import {is_valid_datetime} from '/common_lib'

import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';
import "./dataset.scss"

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit a Dataset
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, dataset) is called.
 *                mode is either "new" or "edit". On save must return a promise and the
 *                promise must be resovled when save is done.
 *
 */

export class DatasetEditor extends StandardDialogbox {
    initDatasetValue = () => {
        return {
            name: '',
            major_version: "1.0",
            minor_version: "1",
            description: "",
            team: "",
            expiration_time: "",
        }
    };

    dialogClassName = "dataset-editor-modal";

    onSave = () => {
        const {dataset, mode} = this.state.payload;

        if (!is_valid_datetime(dataset.expiration_time, true)) {
            this.alert("Expire MUST be in format YYYY-MM-DD HH:MM:SS, for example: 2020-10-03 00:00:00");
            return
        }

        const datasetToSave = _.cloneDeep(dataset);
        if (datasetToSave.expiration_time === "") {
            datasetToSave.expiration_time = null;
        }
        datasetToSave.minor_version = parseInt(datasetToSave.minor_version);

        return this.props.onSave(mode, dataset)
    };

    canSave = () => {
        const {dataset} = this.state.payload;

        // minor version must be natural number
        if (!/^[1-9]\d*$/.test(dataset.minor_version)) {
            return false;
        }
        return dataset.major_version && dataset.name && dataset.team;
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    onOpen = openArgs => {
        const {mode, dataset} = openArgs;
        if (mode === "view" || mode === "edit") {
            const ui_dataset = _.cloneDeep(dataset);
            if (ui_dataset.expiration_time === null) {
                ui_dataset.expiration_time = "";
            }
            ui_dataset.minor_version = ui_dataset.minor_version.toString();
            return {
                mode: mode,
                dataset: ui_dataset,
            };
        } else if (mode === "new") {
            return {
                mode: mode,
                dataset: this.initDatasetValue()
            };
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const payload = this.state.payload;
        if (payload.mode === "new") {
            return "new Dataset";
        } else if (payload.mode === "edit") {
            return "edit Dataset";
        } else if (payload.mode === "view") {
            return "Dataset"
        } else {
            console.assert(false, "mode must be edit, view or new");
        }
    };

    renderBody = () => {
        const {dataset, mode} = this.state.payload;
        return (
            <div>
                <Form.Row>
                    <Form.Group as={Col} controlId="name">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='edit'||mode==='view'}
                            value={dataset.name}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dataset.name = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Form.Group>
                    <Form.Group as={Col} controlId="team">
                        <Form.Label>Team</Form.Label>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='view'}
                            value={dataset.team}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dataset.team = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Form.Group>
                </Form.Row>
                <Form.Row>
                    <Form.Group as={Col} controlId="major_version">
                        <Form.Label>Major Version</Form.Label>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='edit'||mode==='view'}
                            value={dataset.major_version}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dataset.major_version = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Form.Group>
                    <Form.Group as={Col} controlId="minor_version">
                        <Form.Label>Minor Version</Form.Label>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='edit'||mode==='view'}
                            value={dataset.minor_version}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dataset.minor_version = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Form.Group>
                </Form.Row>

                <Form.Row>
                    <Form.Group as={Col} controlId="description">
                        <Form.Label>Description</Form.Label>
                        <CKEditor
                            editor={ ClassicEditor }
                            data={dataset.description}
                            disabled={mode==='view'}
                            type="classic"
                            onChange={(event, editor) => {
                                const v = editor.getData();
                                this.setState(
                                    state => {
                                        state.payload.dataset.description = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Form.Group>
                </Form.Row>
                <Form.Group as={Row} controlId="expiration_time">
                    <Form.Label column sm={2}>Expire</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            size="sm"
                            disabled = {mode==='new' || mode==='view'}
                            value={dataset.expiration_time}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.dataset.expiration_time = v;
                                        return state;
                                    }
                                )
                            }}
                            placeholder="YYYY-mm-dd HH:MM:SS"
                        />
                    </Col>
                </Form.Group>
            </div>
        );
    }
}
