import React from 'react'

import Button from 'react-bootstrap/Button'

import {PipelineTable} from './pipeline_table.jsx'

const _ = require("lodash");

export class TestPipelineTable extends React.Component {
    testPipelineTableRef = React.createRef();

    state = {
        pipelines: [
            {
                id: '7bbafbcd-725e-4208-93b6-df7efc75df9f',
                author: 'stonezhong',
                category: 'daily',
                context: '',
                version: 1,
                dag_version: 1,
                description: '',
                name: 'import-trading-data',
                paused: false,
                retired: false,
                team: 'trading',
            }
        ]
    };

    onPausePipeline = (pipeline_id) => {
        // simulate the pipeline is paused
        this.setState(state => {
            _.find(state.pipelines, p => p.id === pipeline_id).paused = true;
            return state;
        });
    };

    onUnpausePipeline = (pipeline_id) => {
        // simulate the pipeline is paused
        this.setState(state => {
            _.find(state.pipelines, p => p.id === pipeline_id).paused = false;
            return state;
        });
    };

    onEditPipeline = (pipeline) => {
        console.log("user want to edit pipeline");
        console.log(pipeline);
    };

    render() {
        return (
            <div>
                <h2>Test PipelineTable</h2>

                <PipelineTable
                    pipelines={this.state.pipelines}
                    allowEdit = {true}
                    onPause = {this.onPausePipeline}
                    onUnpause = {this.onUnpausePipeline}
                    editPipeline={this.onEditPipeline}
                />
            </div>
        );
    }
}
