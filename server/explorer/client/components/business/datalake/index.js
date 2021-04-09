import React from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Container from 'react-bootstrap/Container';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import {DataTable} from '/components/generic/datatable/main.jsx';

import {is_json_string} from '/common_lib.js';
import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';
import {saveTenant} from '/apis';

import "./datalake.scss";

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit an Datalake
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, datalake) is called.
 *                mode is either "new" or "edit"
 *
 */
export class DatalakeEditor extends StandardDialogbox {
    initDatalakeValue = () => {
        return {
            name: '-- enter name --',
            description: '',
            is_public: false,
            config: '{"type": "?"}',
        }
    };

    dialogClassName = "datalake-editor-modal";

    isNameValid = (datalake) => {
        return datalake.name.trim().length > 0;
    }

    isConfigValid = (datalake) => {
        return is_json_string(datalake.config);
    }

    isValidAwsEmrMasterNode = (dl_config) => {
        return dl_config.type!=='aws-emr' || this.get_aws_emr(dl_config).master_node.trim().length > 0;
    };

    isValidRunDir = (dl_config) => {
        return dl_config.type!=='aws-emr' || this.get_aws_emr(dl_config).run_dir.trim().length > 0;
    };

    isValidAwsEmrSSHKey = (dl_config) => {
        return dl_config.type!=='aws-emr' || this.get_aws_emr(dl_config).ssh_key.trim().length > 0;
    };

    isValidDmUsername = (dl_config) => {
        return dl_config.type!=='aws-emr' || this.get_aws_emr(dl_config).dm_username.trim().length > 0;
    };

    isValidDmPassword = (dl_config) => {
        return dl_config.type!=='aws-emr' || this.get_aws_emr(dl_config).dm_password.trim().length > 0;
    };

    onSave = () => {
        const {datalake, mode, dl_config} = this.state.payload;
        const config = {type: dl_config.type};

        if (config.type === 'aws-emr') {
            config.aws_emr = dl_config.aws_emr;
        }

        const ui_datalake = _.cloneDeep(datalake);
        ui_datalake.config = JSON.stringify(config);
        return this.props.onSave(mode, ui_datalake);
    };

    canSave = () => {
        const {datalake, dl_config} = this.state.payload;

        return this.isNameValid(datalake) &&
            this.isConfigValid(datalake) &&
            this.isValidAwsEmrMasterNode(dl_config) &&
            this.isValidAwsEmrSSHKey(dl_config) &&
            this.isValidRunDir(dl_config);
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    get_aws_emr = (dl_config) => {
        if (!('aws_emr' in dl_config)) {
            dl_config.aws_emr = {
                master_node: '',
                ssh_key: '',
                run_dir: '',
                dm_username:'',
                dm_password:'',
            }
        }
        return dl_config.aws_emr;
    };

    onOpen = openArgs => {
        const {mode, datalake} = openArgs;

        if (mode === "view" || mode === "edit") {
            let dl_config = {};
            try {
                dl_config = JSON.parse(datalake.config);
            }
            catch(error) {
            }

            return {
                mode: mode,
                datalake: _.cloneDeep(datalake),
                dl_config: dl_config,
            };
        } else if (mode === "new") {
            return {
                mode: mode,
                datalake: this.initDatalakeValue(),
                dl_config: {type: '?'}
            }
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "new") {
            return "new Datalake";
        } else if (mode === "edit") {
            return "edit Datalake";
        } else if (mode === "view") {
            return "Datalake"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };


    renderBody = () => {
        const {datalake, mode, dl_config} = this.state.payload;
        return (
            <div>
                <Form>
                    <Tabs
                        defaultActiveKey="BasicInfo"
                        transition={false}
                    >
                        <Tab eventKey="BasicInfo" title="Basic Info">
                            <Container fluid className="pt-2">
                                <Form.Group as={Row} controlId="name">
                                    <Form.Label column sm={2}>Name</Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            size="sm"
                                            disabled = {mode==='edit'||mode==='view'}
                                            value={datalake.name}
                                            isInvalid={!this.isNameValid(datalake)}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(
                                                    state => {
                                                        state.payload.datalake.name = v;
                                                        return state;
                                                    }
                                                )
                                            }}
                                        />
                                        <Form.Control.Feedback tooltip type="invalid">
                                            Cannot be empty.
                                        </Form.Control.Feedback>
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row} controlId="description">
                                    <Form.Label column sm={2}>Description</Form.Label>
                                    <Col sm={10}>
                                        <CKEditor
                                            editor={ ClassicEditor }
                                            data={datalake.description}
                                            disabled={mode==='view'}
                                            type="classic"
                                            onChange={(event, editor) => {
                                                const v = editor.getData();
                                                this.setState(
                                                    state => {
                                                        state.payload.datalake.description = v;
                                                        return state;
                                                    }
                                                )
                                            }}
                                        />
                                    </Col>
                                </Form.Group>
                                <Form.Group as={Row}>
                                    <Form.Label className="pr-2" >Type</Form.Label>
                                    <Form.Check
                                        disabled = {mode==='view'}
                                        inline
                                        name="datalake-type"
                                        label="Unknown"
                                        type="radio"
                                        checked={dl_config.type=="?"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.dl_config.type = "?";
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Check
                                        disabled = {mode==='view'}
                                        inline
                                        name="datalake-type"
                                        label="AWS EMR"
                                        type="radio"
                                        checked={dl_config.type=="aws-emr"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.dl_config.type = "aws-emr";
                                                return state;
                                            })
                                        }}
                                    />
                                </Form.Group>
                            </Container>
                        </Tab>
                        {
                            dl_config.type === "aws-emr" &&
                            <Tab eventKey="aws-emr" title="AWS EMR">
                                <Container fluid className="pt-2">
                                    <Form.Group as={Row} controlId="name">
                                        <Form.Label column sm={2}>Master Node</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                size="sm"
                                                disabled = {mode==='view'}
                                                value={this.get_aws_emr(dl_config).master_node}
                                                isInvalid={!this.isValidAwsEmrMasterNode(dl_config)}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            this.get_aws_emr(state.payload.dl_config).master_node = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                            <Form.Control.Feedback tooltip type="invalid">
                                                Cannot be empty.
                                            </Form.Control.Feedback>
                                        </Col>
                                    </Form.Group>
                                    <Form.Group as={Row} controlId="run-dir">
                                        <Form.Label column sm={2}>Run dir</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                size="sm"
                                                disabled = {mode==='view'}
                                                value={this.get_aws_emr(dl_config).run_dir}
                                                isInvalid={!this.isValidRunDir(dl_config)}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            this.get_aws_emr(state.payload.dl_config).run_dir = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                            <Form.Control.Feedback tooltip type="invalid">
                                                Cannot be empty.
                                            </Form.Control.Feedback>
                                        </Col>
                                    </Form.Group>

                                    <Form.Group as={Row} controlId="dm-username">
                                        <Form.Label column sm={2}>DM Username</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                size="sm"
                                                disabled = {mode==='view'}
                                                value={this.get_aws_emr(dl_config).dm_username}
                                                isInvalid={!this.isValidDmUsername(dl_config)}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            this.get_aws_emr(state.payload.dl_config).dm_username = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                            <Form.Control.Feedback tooltip type="invalid">
                                                Cannot be empty.
                                            </Form.Control.Feedback>
                                        </Col>
                                    </Form.Group>

                                    <Form.Group as={Row} controlId="dm-password">
                                        <Form.Label column sm={2}>DM Password</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                type="password"
                                                size="sm"
                                                disabled = {mode==='view'}
                                                value={this.get_aws_emr(dl_config).dm_password}
                                                isInvalid={!this.isValidDmPassword(dl_config)}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            this.get_aws_emr(state.payload.dl_config).dm_password = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                            <Form.Control.Feedback tooltip type="invalid">
                                                Cannot be empty.
                                            </Form.Control.Feedback>
                                        </Col>
                                    </Form.Group>

                                    <Form.Group as={Row} controlId="datarepo-context">
                                        <Form.Label column sm={2}>SSH Key</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                as="textarea"
                                                rows="10"
                                                size="sm"
                                                className="monofont"
                                                disabled = {mode==='view'}
                                                value={this.get_aws_emr(dl_config).ssh_key}
                                                isInvalid={!this.isValidAwsEmrSSHKey(dl_config)}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            this.get_aws_emr(state.payload.dl_config).ssh_key = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                            <Form.Control.Feedback tooltip type="invalid">
                                                Cannot be empty.
                                            </Form.Control.Feedback>
                                        </Col>
                                    </Form.Group>

                                </Container>
                            </Tab>
                        }
                    </Tabs>
                </Form>
            </div>
        );
    }
}


/*********************************************************************************
 * Purpose: Show list of subscriptions
 * TODO: pagination
 *
 * Props
 *     subscriptions : a list of subscriptions
 *
 */
 export class SubscriptionTable extends React.Component {
    theDataTableRef     = React.createRef();
    theDatalakeEditorRef    = React.createRef();

    onSave = (mode, tenant) => {
        return saveTenant(
            this.props.csrf_token, mode, tenant
        ).then(this.theDataTableRef.current.refresh)
    };

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit, {});
    };

    render_tools = subscription => {
        return (<Button
            variant="secondary"
            size="sm"
            onClick={() => {
                this.theDatalakeEditorRef.current.openDialog({
                    mode: "edit",
                    datalake: subscription.tenant
                });
            }}
        >
            Edit
        </Button>);
    };

    render_name = subscription => {
        return <DatalakeLink datalake={subscription.tenant} />;
    };

    render_is_admin = subscription => {
        return <div>{subscription.is_admin?"Yes":"No"}</div>;
    };

    columns = {
        tools:              {display:"", render_data: this.render_tools},
        name:               {display: "Name", render_data: this.render_name},
        is_admin:           {display: "Is Admin", render_data: this.render_is_admin},
    };

    refresh = () => this.theDataTableRef.current.refresh();
    reset   = () => this.theDataTableRef.current.reset();

    render() {
        return (
            <div>
                <DataTable
                    ref={this.theDataTableRef}
                    hover
                    bordered
                    className="subscription-table"
                    columns = {this.columns}
                    id_column = "id"
                    size = {this.props.size}
                    page_size={this.props.page_size}
                    fast_step_count={10}
                    get_page={this.get_page}
                />
                <DatalakeEditor
                    ref={this.theDatalakeEditorRef}
                    onSave={this.onSave}
                />
            </div>
        )
    }
}

/*********************************************************************************
 * Purpose: Link to an application
 *
 * Props
 *     application: The application to link to
 *
 */

 export class DatalakeLink extends React.Component {
    render() {
        return (
            <a href={`/explorer/${this.props.datalake.id}/datasets`}>
                {this.props.datalake.name}
            </a>
        );
    }
}

