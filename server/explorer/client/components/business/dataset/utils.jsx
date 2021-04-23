import React from 'react'

/*********************************************************************************
 * Purpose: Link to a dataset
 *
 * Props
 *     ds       : dataset
 *
 */
export class DatasetLink extends React.Component {
    render() {
        return <a href={`/explorer/${this.props.tenant_id}/dataset?id=${this.props.ds.id}`}>
            {this.props.ds.name}:{this.props.ds.major_version}:{this.props.ds.minor_version}
        </a>;
    }
}

/*********************************************************************************
 * Purpose: Link to a asset
 *
 * Props
 *     ds       : dataset
 *     dsi      : dataset instance
 *
 */
export class AssetLink extends React.Component {
    render() {
        return <a href={`/explorer/${this.props.tenant_id}/asset?path=${this.props.dataset.name}:${this.props.dataset.major_version}:${this.props.dataset.minor_version}:${this.props.asset.name}`}>{this.props.asset.name}</a>;
    }
}

/*********************************************************************************
 * Purpose: Link to a asset
 *
 * Props
 *     path : A full asset path, may or may not have revision. E.g.: trading:1.0:1:foo:0
 *            or trading:1.0:1:foo
 *
 */
export class AssetLinkFromPath extends React.Component {
    render() {
        const segs = this.props.asset_path.split(":");
        if (segs.length == 4) {
            return <a href={`/explorer/${this.props.tenant_id}/asset?path=${this.props.path}`}>{this.props.path}</a>;
        }
        if (segs.length == 5) {
            const path2 = segs.slice(0, 4).join(':');
            const revision = segs[4];
            return <a href={`/explorer/${this.props.tenant_id}/asset?path=${path2}#revision-${segs[4]}`}>{this.props.path}</a>;
        }
        throw Exception(`${this.props.path} is not a valid asset path`);
    }
}
