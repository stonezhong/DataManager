import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'

import * as Icon from 'react-bootstrap-icons'

import { v4 as uuidv4 } from 'uuid';

import {SequentialTaskEditor} from './task_editor.jsx'


const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit a Pipeline
 *
 * Props
 *     applications: a list of all possible applications
 *                   each application must has field 'id' and 'name'
 *     onSave   : onSave(mode, pipeline) is called when user save the change
 *
 */
export class PipelineEditor extends React.Component {
    theTaskEditorRef = React.createRef();

    initPipelineValue = () => {
        return {
            name: '',
            team: '',
            category: '',
            description: '',
            // belong to the context
            type        : 'sequential',
            dag_id      : '',                // for external pipeline
            requiredDSIs: [],          // required dataset instances
            tasks       : [],
            dependencies: [],          // e.g. [{id: 1, src:'foo', dst: 'bar'},... ], means foo depend on bar
            _toAddAssertPath: '',
            _srcDepTaskName: '',
            _dstDepTaskName: '',

        };
    };

    state = {
        show: false,
        mode: "new",      // either edit or new
        pipeline: this.initPipelineValue(),
    };

    onClose = () => {
        this.setState({show: false});
    };

    onSave = () => {
        const pipeline = _.cloneDeep(this.state.pipeline);
        const mode = this.state.mode;
        delete pipeline._toAddAssertPath;
        delete pipeline._srcDepTaskName;
        delete pipeline._dstDepTaskName;
        this.setState({show: false}, () => {this.props.onSave(mode, pipeline)});
    };

    canSave = () => {
        if (!this.state.pipeline.name || !this.state.pipeline.team || !this.state.category) {
            return false;
        }
        return true;
    };

    getApplicationName = task => {
        if (task.type != "other") {
            return ""
        }
        const apps = this.props.applications.filter(p => p.id==task.application_id);
        if (apps.length > 0) {
            return apps[0].name;
        }
        return "";
    };

    // user shall convert the django output to native pipeline format
    // using pipeline_from_django_model
    openDialog = (mode, pipeline) => {
        if (mode === "view" || mode === "edit") {
            const myPipeline = _.cloneDeep(pipeline);
            myPipeline._toAddAssertPath = '';
            myPipeline._srcDepTaskName = '';
            myPipeline._dstDepTaskName = '';
            if (!('dependencies' in myPipeline)) {
                myPipeline.dependencies = [];
            }
            this.setState({
                show: true,
                mode: mode,
                pipeline: myPipeline
            });
        } else {
            this.setState({
                show: true,
                mode: mode,
                pipeline: this.initPipelineValue()
            });
        }
    };

    addTask = () => {
        this.theTaskEditorRef.current.openDialog("new");
    };

    deleteTask = (task) => {
        this.setState(state => {
            const new_tasks = state.pipeline.tasks.filter(t => t.name != task.name);
            state.pipeline.tasks = new_tasks;
            const new_dependencies = state.pipeline.dependencies.filter(
                t => (t.src!==task.name)&&(t.dst!==task.name)
            )
            state.pipeline.dependencies = new_dependencies;
            return state;
        });
    };

    onTaskSaved = (mode, task) => {
        this.setState(state => {
            const idx = state.pipeline.tasks.findIndex(taskX => taskX.name == task.name);
            if (idx >= 0) {
                state.pipeline.tasks[idx] = task;
            } else {
                state.pipeline.tasks.push(task);
            }
            return state;
        });
    };

    editTask = task => {
        this.theTaskEditorRef.current.openDialog("edit", task);
    };

    viewTask = task => {
        this.theTaskEditorRef.current.openDialog("view", task);
    };

    get_title = () => {
        if (this.state.mode === "new") {
            return "new Pipeline";
        } else if (this.state.mode === "edit") {
            return "edit Pipeline";
        } else if (this.state.mode === "view") {
            return "Pipeline"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };


    canSave = () => {
        return this.state.pipeline.name && this.state.pipeline.team && this.state.pipeline.category;
    };


    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='xl'
                scrollable
            >

                <Modal.Header closeButton>
                    <Modal.Title>{this.get_title()}</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Form>
                            <Row>
                                <Col xs={4}>
                                    <Form.Group controlId="pipeline-name">
                                        <Form.Label>Name</Form.Label>
                                        <Form.Control
                                            disabled = {this.state.mode==='edit' || this.state.mode==='view'}
                                            value={this.state.pipeline.name}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline.name = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={4}>
                                    <Form.Group controlId="pipeline-team">
                                        <Form.Label>Team</Form.Label>
                                        <Form.Control
                                            disabled = {this.state.mode==='view'}
                                            value={this.state.pipeline.team}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline.team = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={4}>
                                    <Form.Group controlId="pipeline-category">
                                        <Form.Label>Category</Form.Label>
                                        <Form.Control
                                            disabled = {this.state.mode==='view'}
                                            value={this.state.pipeline.category}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline.category = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group controlId="pipeline-description">
                                        <Form.Label>Description</Form.Label>
                                        <Form.Control as="textarea" rows="3"
                                            disabled = {this.state.mode==='view'}
                                            value={this.state.pipeline.description}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline.description = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            {
                                this.state.pipeline.requiredDSIs &&
                                <Row>
                                    <Col>
                                        <h2>Required assers</h2>
                                        <Table hover bordered  size="sm" >
                                            <thead className="thead-dark">
                                                <tr>
                                                    <th className="c-tc-icon1"></th>
                                                    <th>Asset Path</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    this.state.pipeline.requiredDSIs.map(requiredDSI => {
                                                        return (
                                                            <tr key={requiredDSI}>
                                                                <td className="align-middle">
                                                                    <Button
                                                                        disabled = {this.state.mode==='view'}
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        onClick={ event => {
                                                                            this.setState(state => {
                                                                                _.remove(state.pipeline.requiredDSIs, i => i===requiredDSI);
                                                                                return state;
                                                                            });
                                                                        }}
                                                                    >
                                                                        <Icon.X />
                                                                    </Button>
                                                                </td>
                                                                <td className="align-middle">{requiredDSI}</td>
                                                            </tr>
                                                        );
                                                    })
                                                }
                                                {
                                                    (this.state.mode === 'edit' || this.state.mode === 'new') &&
                                                    <tr>
                                                        <td className="align-middle">
                                                            <Button
                                                                disabled = {!this.state.pipeline._toAddAssertPath.trim()}
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={event => {
                                                                    this.setState(state => {
                                                                        const v = state.pipeline._toAddAssertPath.trim();
                                                                        state.pipeline.requiredDSIs.push(v);
                                                                        state.pipeline._toAddAssertPath = '';
                                                                        return state;
                                                                    });
                                                                }}
                                                            >
                                                                <Icon.Plus />
                                                            </Button>
                                                        </td>
                                                        <td>
                                                            <Form.Control id="requiredDSI_to_add"
                                                                value={this.state.pipeline._toAddAssertPath}
                                                                onChange={(event) => {
                                                                    const v = event.target.value;
                                                                    this.setState(state => {
                                                                        state.pipeline._toAddAssertPath = v;
                                                                        return state;
                                                                    })
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                }
                                            </tbody>
                                        </Table>
                                    </Col>
                                </Row>
                            }
                            <Row>
                                <Col>
                                    <Form.Label className="pr-2" >Type</Form.Label>
                                    <Form.Check
                                        disabled = {this.state.mode==='view'}
                                        name="pipeline-type"
                                        inline
                                        label="Sequential"
                                        type="radio"
                                        checked={this.state.pipeline.type=="sequential"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.pipeline.type = "sequential";
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Check
                                        disabled = {this.state.mode==='view'}
                                        name="pipeline-type"
                                        inline
                                        label="External"
                                        type="radio"
                                        checked={this.state.pipeline.type==="external"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.pipeline.type = "external";
                                                return state;
                                            })
                                        }}
                                    />
                                </Col>
                            </Row>
                            {
                                (this.state.pipeline.type==="sequential") &&
                                <Row>
                                    <Col>
                                        <h2 className="c-ib">Tasks</h2>
                                        <Button
                                            disabled = {this.state.mode==='view'}
                                            className="c-vc ml-2"
                                            size="sm"
                                            onClick={this.addTask}
                                        >
                                            Add Task
                                        </Button>
                                    </Col>
                                </Row>
                            }
                            {
                                (this.state.pipeline.type==="sequential") &&
                                <Row>
                                    <Col>
                                        <Table hover bordered size="sm">
                                            <thead className="thead-dark">
                                                <tr>
                                                    <th className="c-tc-icon2"></th>
                                                    <th>Name</th>
                                                    <th>Type</th>
                                                    <th>Application</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {
                                                this.state.pipeline.tasks.map((task) => {
                                                    return (
                                                        <tr key={task.name}>
                                                            <td className="align-middle">
                                                                <Button
                                                                    disabled = {this.state.mode==='view'}
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="mr-2"
                                                                    onClick={event => {this.deleteTask(task)}}
                                                                >
                                                                    <Icon.X />
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={event => {
                                                                        if (this.state.mode==='view') {
                                                                            this.viewTask(task)
                                                                        } else {
                                                                            this.editTask(task)
                                                                        }
                                                                    }}
                                                                >
                                                                    { this.state.mode === "view"?<Icon.Info />:<Icon.Pencil /> }
                                                                </Button>
                                                            </td>
                                                            <td className="align-middle">{task.name}</td>
                                                            <td className="align-middle">{task.type}</td>
                                                            <td className="align-middle">{this.getApplicationName(task)}</td>
                                                        </tr>
                                                    )
                                                })
                                            }
                                            </tbody>
                                        </Table>
                                    </Col>
                                </Row>
                            }
                            {
                                (this.state.pipeline.type==="sequential") &&
                                <Row>
                                    <Col>
                                        <h2>Dependency</h2>
                                        <Table hover bordered size="sm">
                                            <thead className="thead-dark">
                                                <tr>
                                                    <th className="c-tc-icon2"></th>
                                                    <th>Source Task</th>
                                                    <th></th>
                                                    <th>Destination Task</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    this.state.pipeline.dependencies.map(dep =>
                                                        <tr key={dep.id}>
                                                            <td>
                                                                <Button
                                                                    disabled = {this.state.mode==='view'}
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={ event => {
                                                                        this.setState(state => {
                                                                            _.remove(state.pipeline.dependencies, i => i.id === dep.id);
                                                                            return state;
                                                                        });
                                                                    }}
                                                                >
                                                                    <Icon.X />
                                                                </Button>
                                                            </td>
                                                            <td>{dep.src}</td>
                                                            <td>{"==>"}</td>
                                                            <td>{dep.dst}</td>
                                                        </tr>
                                                    )
                                                }
                                                <tr>
                                                    <td>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            disabled={
                                                                (this.state.pipeline._srcDepTaskName === '') ||
                                                                (this.state.pipeline._dstDepTaskName === '') ||
                                                                (this.state.pipeline._srcDepTaskName === this.state.pipeline._dstDepTaskName)
                                                            }
                                                            onClick={ event => {
                                                                this.setState(state => {
                                                                    const dep = {
                                                                        id: uuidv4(),
                                                                        src: state.pipeline._srcDepTaskName,
                                                                        dst: state.pipeline._dstDepTaskName
                                                                    };
                                                                    state.pipeline._srcDepTaskName = '';
                                                                    state.pipeline._dstDepTaskName = '';
                                                                    state.pipeline.dependencies.push(dep);
                                                                    return state;
                                                                });
                                                            }}
                                                        >
                                                            Add
                                                        </Button>
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            as="select"
                                                            disabled = {this.state.mode==='view'}
                                                            value={this.state.pipeline._srcDepTaskName}
                                                            onChange={event => {
                                                                const v = event.target.value;
                                                                this.setState(state => {
                                                                    state.pipeline._srcDepTaskName = v;
                                                                    return state;
                                                                });
                                                            }}
                                                        >
                                                            <option key="" value="">------</option>
                                                            {this.state.pipeline.tasks.map(task =>
                                                                <option key={task.name} value={task.name}>{task.name}</option>
                                                            )}
                                                        </Form.Control>
                                                    </td>
                                                    <td>
                                                        depend on
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            as="select"
                                                            disabled = {this.state.mode==='view'}
                                                            value={this.state.pipeline._dstDepTaskName}
                                                            onChange={event => {
                                                                const v = event.target.value;
                                                                this.setState(state => {
                                                                    state.pipeline._dstDepTaskName = v;
                                                                    return state;
                                                                });
                                                            }}
                                                        >
                                                            <option key="" value="">------</option>
                                                            {this.state.pipeline.tasks.map(task =>
                                                                <option key={task.name} value={task.name}>{task.name}</option>
                                                            )}
                                                        </Form.Control>
                                                    </td>
                                                </tr>

                                            </tbody>
                                        </Table>
                                    </Col>
                                </Row>

                            }
                            {
                                (this.state.pipeline.type==="external") &&
                                <Row>
                                    <Col>
                                        <Form.Group as={Row} controlId="pipeline-dag-id">
                                            <Form.Label column sm={2}>DAG ID</Form.Label>
                                            <Col sm={10}>
                                                <Form.Control
                                                    disabled = {this.state.mode==='view'}
                                                    value={this.state.pipeline.dag_id}
                                                    onChange={(event) => {
                                                        const v = event.target.value;
                                                        this.setState( state => {
                                                            state.pipeline.dag_id = v;
                                                            return state;
                                                        });
                                                    }}
                                                />
                                            </Col>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            }
                        </Form>

                        <Row>
                            <Col>
                                <SequentialTaskEditor
                                    ref={this.theTaskEditorRef}
                                    onSave={this.onTaskSaved}
                                    applications={this.props.applications}
                                />
                            </Col>
                        </Row>

                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    {
                        (
                            this.state.mode === "edit" ||
                            this.state.mode === "new"
                        ) &&
                        <Button
                            variant="primary"
                            onClick={this.onSave}
                            disabled={!this.canSave()}
                        >
                            Save changes
                        </Button>
                    }
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
