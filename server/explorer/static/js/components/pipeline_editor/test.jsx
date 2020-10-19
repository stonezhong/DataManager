import React from 'react'

import Button from 'react-bootstrap/Button'

import {PipelineEditor} from './pipeline_editor.jsx'

export class TestPipelineEditor extends React.Component {
    testPipelineEditorRef = React.createRef();

    onSave = (mode, pipeline) => {
        console.log(`Test Pipeline is saved as ${mode}`);
        console.log(pipeline);
    };

    render() {
        return (
            <div>
                <h2>Test PipelineEditor</h2>
                <PipelineEditor
                    ref={this.testPipelineEditorRef}
                    onSave={this.onSave}
                    applications={[
                        {
                            app_location: "hdfs:///etl/apps/generate_trading_samples/1.0.0.0",
                            author: "stonezhong",
                            description: "",
                            id: "1e871b84-5ee8-45e3-bd29-a62b52bdfe56",
                            name: "Import Trading Data",
                            retired: false,
                            team: "trading"
                        }
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
                            type: "sequential",
                            author: "stonezhong",
                            category: "daily",
                            team: "trading",
                            dag_id: "",
                            version: 1,
                            dag_version: "",
                            description: "",
                            id: "7bbafbcd-725e-4208-93b6-df7efc75df9f",
                            name: "import-trading-data",
                            paused: false,
                            requiredDSIs: [],
                            tasks: [
                                {
                                    application_id: '1e871b84-5ee8-45e3-bd29-a62b52bdfe56',
                                    args: "{}",
                                    description: "",
                                    name: "import-trading-data",
                                    steps: [],
                                    type: "other"
                                }
                            ],
                        });
                    }}
                >
                    Edit Pipeline
                </Button>
            </div>
        );
    }
}
