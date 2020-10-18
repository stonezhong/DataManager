import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Button from 'react-bootstrap/Button'

import {SQLStepEditor} from './components/sql_step_editor.jsx'
import {SequentialTaskEditor} from './components/task_editor.jsx'
import {PipelineEditor} from './components/pipeline_editor.jsx'
import {DatasetEditor} from './components/dataset_editor.jsx'
import {ApplicationEditor} from './components/application_editor.jsx'

// This is a placeholder, I will improve the home page latter

class TestPage extends React.Component {
    testSQLEditorRef            = React.createRef();
    testTaskEditorRef           = React.createRef();
    testPipelineEditorRef       = React.createRef();
    testDatasetEditorRef        = React.createRef();
    testApplicationEditorRef    = React.createRef();

    onSaveSQLEditor = (step) => {
        console.log("Test SQL Step is saved");
        console.log(step);
    };

    onCancelSQLEditor = () => {
        console.log("Test SQL Step is not saved");
    };

    onSaveTask = (task) => {
        console.log("Test Task is saved");
        console.log(task);
    };

    onCancelTask = () => {
        console.log("Test Task is not saved");
    };

    onSavePipeline = (mode, pipeline) => {
        console.log("Test Pipeline is saved");
        console.log(pipeline);
    };

    onCancelPipeline = () => {
        console.log("Test Pipeline is not saved");
    };

    onSaveDataset = (mode, pipeline) => {
        console.log(`Test Dataset is saved as ${mode}`);
        console.log(pipeline);
    };

    onCancelDataset = () => {
        console.log("Test Dataset is not saved");
    };

    onSaveApplication = (mode, application) => {
        console.log(`Test Application is saved as ${mode}`);
        console.log(application);
    };

    onCancelApplication = () => {
        console.log("Test Application is not saved");
    };

    render() {
        return (
            <div>
                <h1>Main Test Page</h1>

                <h2>Test SQLSetepEditor</h2>
                <SQLStepEditor
                    ref={this.testSQLEditorRef}
                    onSave={this.onSaveSQLEditor}
                    onCancel={this.onCancelSQLEditor}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testSQLEditorRef.current.openDialog();
                    }}
                >
                    New Step
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testSQLEditorRef.current.openDialog({
                            name: 'foo',
                            imports: [{alias: "X", dsi_name: "trading:1.0:1/{{dt}}"}],
                            sql: "SELECT * FROM X",
                            alias: '',
                            output: {
                                type: 'parquet',
                                write_mode: 'overwrite',
                                location: '',
                                register_dataset_instance: ''
                            }
                        });
                    }}
                >
                    Edit Step
                </Button>
                <hr />

                <h2>Test SequentialTaskEditor</h2>
                <SequentialTaskEditor
                    ref={this.testTaskEditorRef}
                    onSave={this.onSaveTask}
                    onCancel={this.onCancelTask}
                    applications={[
                        {'id': 'a', 'name': 'foo'},
                        {'id': 'b', 'name': 'bar'},

                    ]}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testTaskEditorRef.current.openDialog();
                    }}
                >
                    New Task
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testTaskEditorRef.current.openDialog({
                            name: 'foo',
                            description: 'blah...',
                            type: 'spark-sql',
                            appLocation: '',
                            args: {},
                            steps: [
                                {
                                    name: 'step 1',
                                    imports: [{alias: "X", dsi_name: "trading:1.0:1/{{dt}}"}],
                                    sql: "SELECT * FROM X",
                                    alias: '',
                                    output: {
                                        type: 'parquet',
                                        write_mode: 'overwrite',
                                        location: '',
                                        register_dataset_instance: ''
                                    }

                                }
                            ]
                        });
                    }}
                >
                    Edit Task
                </Button>
                <hr />

                <h2>Test PipelineEditor</h2>
                <PipelineEditor
                    ref={this.testPipelineEditorRef}
                    onSave={this.onSavePipeline}
                    onCancel={this.onCancelPipeline}
                    applications={[
                        {'id': 'a', 'name': 'foo'},
                        {'id': 'b', 'name': 'bar'},
                    ]}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testPipelineEditorRef.current.openDialog();
                    }}
                >
                    New Pipeline
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testPipelineEditorRef.current.openDialog({
                            name: "test-pipeline",
                            team: "trading",
                            category: "daily",
                            description: "Blah...",
                            type: 'sequential',
                            tasks: [],
                            requiredDSIs: [],
                            dag_id: '',
                        });
                    }}
                >
                    Edit Pipeline
                </Button>
                <hr />

                <h2>Test DatasetEditor</h2>
                <DatasetEditor
                    ref={this.testDatasetEditorRef}
                    onSave={this.onSaveDataset}
                    onCancel={this.onCancelDataset}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testDatasetEditorRef.current.openDialog();
                    }}
                >
                    New Dataset
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testDatasetEditorRef.current.openDialog({
                            name: "test data",
                            major_version: "2.1",
                            minor_version: 2,
                            description: "Blah...",
                            team: "trading",
                        });
                    }}
                >
                    Edit Dataset
                </Button>
                <hr />

                <h2>Test ApplicationEditor</h2>
                <ApplicationEditor
                    ref={this.testApplicationEditorRef}
                    onSave={this.onSaveApplication}
                    onCancel={this.onCancelApplication}
                />
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testApplicationEditorRef.current.openDialog();
                    }}
                >
                    New Application
                </Button>
                <Button
                    className="mr-2"
                    onClick={() => {
                        this.testApplicationEditorRef.current.openDialog({
                            name: "test data",
                            description: "Blah...",
                            team: "trading",
                            retired: false,
                            app_location: ''
                        });
                    }}
                >
                    Edit Application
                </Button>
            </div>
      )
    }
}

$(function() {
    ReactDOM.render(
        <TestPage />,
        document.getElementById('app')
    );
});
